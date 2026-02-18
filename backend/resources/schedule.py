"""Schedule endpoints for reading and creating class sessions."""

import logging
from datetime import datetime, timezone
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import Schedule, User, Enrollment
from schemas import ScheduleSchema
from db import db

blp = Blueprint("Schedules", "schedules", url_prefix="/schedules")
logger = logging.getLogger(__name__)


def _get_enrollment_or_404(enrollment_id):
    logger.debug("Resolving enrollment for schedule", extra={"enrollment_id": enrollment_id})
    enrollment = db.session.get(Enrollment, enrollment_id)
    if not enrollment:
        abort(404, message="Enrollment not found.")
    return enrollment

@blp.route("/")
class ScheduleList(MethodView):
    """Collection operations for schedules."""

    @jwt_required()
    @blp.response(200, ScheduleSchema(many=True))
    def get(self):
        """Return all schedules linked to the authenticated user's enrollments."""
        user_id = get_jwt_identity()
        logger.info("Schedule list requested", extra={"user_id": user_id})
        user = db.session.get(User, user_id)
        if not user:
            abort(404, message="User not found.")
        
        # Get all enrollments for the user
        enrollments = Enrollment.query.filter_by(student_id=user_id).all()
        
        # Collect all schedules from the user's enrollments
        schedules = []
        for enrollment in enrollments:
            schedules.extend(enrollment.schedules)
        
        return schedules
    
    @jwt_required()
    @blp.arguments(ScheduleSchema(many=True))
    @blp.response(201, ScheduleSchema(many=True))
    def post(self, data):
        """Create one or more schedules for a single enrollment owned by the caller."""
        user_id = get_jwt_identity()
        logger.info("Schedule create requested", extra={"user_id": user_id, "count": len(data or [])})
        user = db.session.get(User, user_id)
        if not user:
            abort(404, message="User not found.")

        if not data:
            abort(400, message="At least one schedule is required.")

        # Validate all schedules belong to same enrollment
        enrollment_ids = set(item.get("enrollment_id") for item in data)
        if len(enrollment_ids) > 1:
            abort(400, message="All schedules must belong to the same enrollment.")
        
        enrollment_id = enrollment_ids.pop()
        enrollment = _get_enrollment_or_404(enrollment_id)
        
        # Verify user owns this enrollment
        if enrollment.student_id != user_id:
            abort(403, message="Cannot create schedule for another user's enrollment.")

        # Todo: generate zoom link here based on the schedule details and save it to the database
        schedules = []
        for item in data:
            overlapping = (
                Schedule.query
                .filter(
                    Schedule.date == item["date"],
                    Schedule.start_time < item["end_time"],
                    Schedule.end_time > item["start_time"],
                )
                .first()
            )
            if overlapping:
                abort(409, message="Selected time overlaps an existing scheduled class.")

            schedule = Schedule(**item)
            db.session.add(schedule)
            schedules.append(schedule)
        
        # Update enrollment end_date to latest schedule
        max_date = max(s.date for s in schedules)
        if enrollment.end_date is None or max_date > enrollment.end_date:
            enrollment.end_date = max_date
        
        # Update enrollment status based on dates
        enrollment.status = "active" if datetime.now(timezone.utc).date() <= max_date else "completed"
        db.session.commit()
        logger.info("Schedule create completed", extra={"user_id": user_id, "enrollment_id": enrollment_id, "count": len(schedules)})
        return schedules

@blp.route("/<int:schedule_id>")
class ScheduleDetail(MethodView):
    """Read operations for a single schedule."""

    @jwt_required()
    @blp.response(200, ScheduleSchema)
    def get(self, schedule_id):
        """Return one schedule if it belongs to an enrollment owned by the caller."""
        user_id = get_jwt_identity()
        logger.info("Schedule detail requested", extra={"schedule_id": schedule_id, "user_id": user_id})
        user = db.session.get(User, user_id)
        if not user:
            abort(404, message="User not found.")
        
        schedule = Schedule.query.filter(Schedule.id == schedule_id).join(Enrollment).filter_by(student_id=user_id).first()
        
        if not schedule:
            abort(404, message="Schedule not found or access denied.")

        return schedule
