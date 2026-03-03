"""Schedule endpoints for reading and creating class sessions."""

import logging
from datetime import datetime, timezone
from typing import Any, cast
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import Schedule, User, Enrollment
from schemas import ScheduleSchema, ScheduleChangeRequestSchema, ScheduleChangeRequestResponseSchema
from db import db
from utils.decorators import admin_required, student_required
from utils.notifications import notify_schedule_change_requested, notify_schedule_created
from utils.zoom import create_zoom_meeting_link

blp = Blueprint("Schedules", "schedules", url_prefix="/schedules")
logger = logging.getLogger(__name__)


def _get_enrollment_or_404(enrollment_id):
    logger.debug("Resolving enrollment for schedule", extra={"enrollment_id": enrollment_id})
    enrollment = db.session.get(Enrollment, enrollment_id)
    if not enrollment:
        abort(404, message="Enrollment not found.")
    return enrollment


def _get_or_create_shared_zoom_link(enrollment: Enrollment) -> str:
    existing_zoom_link = (
        db.session.query(Schedule.zoom_link)
        .filter(
            Schedule.enrollment_id == enrollment.id,
            Schedule.zoom_link.isnot(None),
            Schedule.zoom_link != "",
        )
        .order_by(Schedule.id.asc())
        .limit(1)
        .scalar()
    )
    if existing_zoom_link:
        return str(existing_zoom_link)

    topic = f"{enrollment.course.title} - Enrollment {enrollment.id}"
    try:
        return create_zoom_meeting_link(topic=topic)
    except RuntimeError as exc:
        logger.exception("Zoom meeting creation failed", extra={"enrollment_id": enrollment.id})
        abort(502, message=str(exc))


def _create_shared_zoom_link(enrollment: Enrollment) -> str:
    topic = f"{enrollment.course.title} - Enrollment {enrollment.id}"
    try:
        return create_zoom_meeting_link(topic=topic)
    except RuntimeError as exc:
        logger.exception("Zoom meeting creation failed", extra={"enrollment_id": enrollment.id})
        abort(502, message=str(exc))


def _sync_enrollment_schedule_window(enrollment: Enrollment):
    enrollment_schedules = cast(list[Any], enrollment.schedules)
    schedule_dates = [schedule.date for schedule in enrollment_schedules if schedule.date is not None]
    if not schedule_dates:
        return

    first_date = min(schedule_dates)
    last_date = max(schedule_dates)
    enrollment.start_date = datetime.combine(first_date, datetime.min.time())
    enrollment.end_date = datetime.combine(last_date, datetime.min.time())
    enrollment.status = "active" if datetime.now(timezone.utc).date() <= last_date else "completed"

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
        had_existing_schedules = len(cast(list[Any], enrollment.schedules)) > 0
        onboarding_flags = {item.get("is_onboarding_booking") for item in data}
        explicit_onboarding_flags = {flag for flag in onboarding_flags if flag is not None}
        if len(explicit_onboarding_flags) > 1:
            abort(400, message="All schedules in a request must use the same onboarding flag.")
        requested_onboarding_booking = next(iter(explicit_onboarding_flags), False)

        if enrollment.status == "completed":
            abort(409, message="Enrollment is completed. Set it to active before adding new schedules.")
        
        # Students can only create schedules for their own enrollments; admins can create for any enrollment.
        if user.role != "admin" and enrollment.student_id != user_id:
            abort(403, message="Cannot create schedule for another user's enrollment.")

        shared_zoom_link = _get_or_create_shared_zoom_link(enrollment)

        schedules = []
        for item in data:
            schedule_payload = {key: value for key, value in item.items() if key != "is_onboarding_booking"}
            overlapping = (
                Schedule.query
                .filter(
                    Schedule.date == schedule_payload["date"],
                    Schedule.start_time < schedule_payload["end_time"],
                    Schedule.end_time > schedule_payload["start_time"],
                )
                .first()
            )
            if overlapping:
                abort(409, message="Selected time overlaps an existing scheduled class.")

            schedule = Schedule(**schedule_payload)
            schedule.zoom_link = shared_zoom_link
            db.session.add(schedule)
            schedules.append(schedule)
        
        _sync_enrollment_schedule_window(enrollment)
        db.session.commit()

        queued_count = 0
        if enrollment.status != "completed":
            student = cast(User, enrollment.student)
            is_valid_onboarding_booking = (
                requested_onboarding_booking
                and user.role != "admin"
                and enrollment.student_id == user_id
                and not had_existing_schedules
                and len(schedules) == 1
            )
            if requested_onboarding_booking and not is_valid_onboarding_booking:
                abort(400, message="Onboarding booking flag is only valid for a student's first enrollment session.")

            queued_to_admins = (
                user.role != "admin"
                and enrollment.student_id == user_id
                and is_valid_onboarding_booking
            )
            queued_count = notify_schedule_created(
                student=student,
                course_title=enrollment.course.title,
                schedule_count=len(schedules),
                first_date=min(s.date for s in schedules) if schedules else None,
                include_admins=queued_to_admins,
            )
        logger.info(
            "Schedule notifications queued",
            extra={"user_id": user_id, "enrollment_id": enrollment_id, "queued_count": queued_count},
        )
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


@blp.route("/<int:schedule_id>/request-change")
class ScheduleChangeRequest(MethodView):
    """Student action to request schedule changes from admins."""

    @jwt_required()
    @student_required
    @blp.arguments(ScheduleChangeRequestSchema)
    @blp.response(200, ScheduleChangeRequestResponseSchema)
    def post(self, data, schedule_id):
        user_id = get_jwt_identity()
        student = db.session.get(User, user_id)
        if not student:
            abort(404, message="User not found.")

        schedule = (
            Schedule.query
            .filter(Schedule.id == schedule_id)
            .join(Enrollment)
            .filter(Enrollment.student_id == user_id)
            .first()
        )
        if not schedule:
            abort(404, message="Schedule not found or access denied.")

        schedule.status = "reschedule_requested"
        db.session.commit()

        queued_count = notify_schedule_change_requested(
            student=student,
            schedule=schedule,
            subject=data["subject"],
            comments=data.get("comments", ""),
        )

        logger.info(
            "Schedule change requested",
            extra={"user_id": user_id, "schedule_id": schedule_id, "queued_count": queued_count},
        )

        return {
            "message": "Schedule change request sent to admins.",
            "schedule_id": schedule.id,
            "queued_count": queued_count,
        }


@blp.route("/enrollments/<int:enrollment_id>/refresh-zoom-link")
class EnrollmentZoomLinkRefresh(MethodView):
    """Admin operations for enrollment-level shared Zoom links."""

    @jwt_required()
    @admin_required
    def post(self, enrollment_id):
        enrollment = _get_enrollment_or_404(enrollment_id)
        new_zoom_link = _create_shared_zoom_link(enrollment)

        updated_count = 0
        enrollment_schedules = cast(list[Any], enrollment.schedules)
        for schedule in enrollment_schedules:
            schedule.zoom_link = new_zoom_link
            updated_count += 1

        db.session.commit()
        logger.info(
            "Enrollment Zoom link refreshed",
            extra={"enrollment_id": enrollment_id, "updated_count": updated_count},
        )

        return {
            "message": "Enrollment Zoom link refreshed.",
            "enrollment_id": enrollment_id,
            "zoom_link": new_zoom_link,
            "updated_count": updated_count,
        }, 200
