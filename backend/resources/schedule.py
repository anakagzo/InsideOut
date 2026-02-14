from datetime import datetime
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import Schedule, User, Enrollment
from schemas import ScheduleSchema
from db import db

blp = Blueprint("Schedules", "schedules", url_prefix="/schedules")

@blp.route("/")
class ScheduleList(MethodView):
    @jwt_required()
    @blp.response(200, ScheduleSchema(many=True))
    def get(self):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
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
    @blp.arguments(ScheduleSchema, many=True)
    @blp.response(201, ScheduleSchema(many=True))
    def post(self, data):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            abort(404, message="User not found.")

        if not data:
            abort(400, message="At least one schedule is required.")

        # Validate all schedules belong to same enrollment
        enrollment_ids = set(item.get("enrollment_id") for item in data)
        if len(enrollment_ids) > 1:
            abort(400, message="All schedules must belong to the same enrollment.")
        
        enrollment_id = enrollment_ids.pop()
        enrollment = Enrollment.query.get_or_404(enrollment_id)
        
        # Verify user owns this enrollment
        if enrollment.student_id != user_id:
            abort(403, message="Cannot create schedule for another user's enrollment.")

        # Todo: generate zoom link here based on the schedule details and save it to the database
        schedules = []
        for item in data:
            schedule = Schedule(**item)
            db.session.add(schedule)
            schedules.append(schedule)
        
        # Update enrollment end_date to latest schedule
        max_date = max(s.date for s in schedules)
        if enrollment.end_date is None or max_date > enrollment.end_date:
            enrollment.end_date = max_date
        
        # Update enrollment status based on dates
        enrollment.status = "active" if datetime.utcnow().date() <= max_date else "completed"
        db.session.commit()
        return schedules

@blp.route("/<int:schedule_id>")
class ScheduleDetail(MethodView):
    @jwt_required()
    @blp.response(200, ScheduleSchema)
    def get(self, schedule_id):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            abort(404, message="User not found.")
        
        schedule = Schedule.query.filter(Schedule.id == schedule_id).join(Enrollment).filter_by(student_id=user_id).first()
        
        if not schedule:
            abort(404, message="Schedule not found or access denied.")

        return schedule
