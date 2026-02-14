from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import admin_required
from models import Enrollment, User, Course
from db import db
from schemas import EnrollmentSchema, GroupedScheduleSchema
from datetime import datetime
from collections import defaultdict
from sqlalchemy import or_, case
from flask import request

blp = Blueprint("Enrollments", "enrollments", url_prefix="/enrollments")


@blp.route("/")
class EnrollmentList(MethodView):
    @jwt_required()
    @admin_required
    @blp.paginate()
    @blp.response(200, EnrollmentSchema(many=True))
    def get(self, pagination_parameters):
        search = request.args.get("search", "")
        
        query = Enrollment.query
        
        if search:
            # Join to both Course and User tables
            query = query.join(Course).join(User)
            
            # Filter by search term across multiple fields
            query = query.filter(
                or_(
                    Course.title.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%")
                )
            )
            
            # Order by relevance (exact matches first, then starts with, then partial)
            relevance = case(
                (Course.title == search, 4),  # Exact course title match
                (Course.title.ilike(f"{search}%"), 3),  # Course title starts with
                (or_(User.first_name == search, User.last_name == search), 2),  # Exact name match
                (or_(User.first_name.ilike(f"{search}%"), User.last_name.ilike(f"{search}%")), 1),  # Name starts with
                else_=0
            )
            query = query.order_by(relevance.desc())
        
        return query

    @jwt_required()
    @blp.arguments(EnrollmentSchema)
    @blp.response(201, EnrollmentSchema)
    def post(self, data):
        user_id = get_jwt_identity()
    
        # Verify student_id matches the authenticated user to prevent enrolling other users
        if data.get("student_id") != user_id:
            abort(403, message="Cannot enroll another user.")

        enrollment = Enrollment(**data)
        db.session.add(enrollment)
        db.session.commit()
        return enrollment
    

@blp.route("/<int:enrollment_id>")
class EnrollmentDetail(MethodView):

    @jwt_required()
    @blp.response(200, EnrollmentSchema)
    def get(self, enrollment_id):
        user_id = get_jwt_identity()
        enrollment = Enrollment.query.get_or_404(enrollment_id)
        if enrollment.student_id != user_id:
            abort(403, message="Access denied.")
        return enrollment
    
    @jwt_required(fresh=True)
    @admin_required 
    def delete(self, enrollment_id):
        enrollment = Enrollment.query.get_or_404(enrollment_id)
        
        db.session.delete(enrollment)
        db.session.commit()
        return {"message": "Enrollment deleted successfully."}, 200
    
@blp.route("/schedules")
class EnrollmentSchedules(MethodView):
    @jwt_required()
    @blp.response(200, GroupedScheduleSchema(many=True))
    def get(self):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            abort(404, message="User not found.")
        
        enrollments = Enrollment.query
        if user.role != "admin":  # Only filter by student_id for non-admin users
            enrollments = enrollments.filter_by(student_id=user_id).all()
        else:
            enrollments = enrollments.all()

        # Group schedules by date
        schedules_by_date = defaultdict(list)
        
        for enrollment in enrollments:
            for schedule in enrollment.schedules:
                date_key = schedule.date.isoformat()  # Use ISO format for date key
                schedules_by_date[date_key].append({
                    "id": schedule.id,
                    "date": schedule.date.isoformat(),
                    "start_time": schedule.start_time.isoformat(),
                    "end_time": schedule.end_time.isoformat(),
                    "zoom_link": schedule.zoom_link,
                    "status": schedule.status
                })
        
        # Convert to list of dicts with 'date' and 'schedules' keys
        result = [
            {
                "date": date,
                "schedules": schedules
            }
            for date, schedules in sorted(schedules_by_date.items())
        ]
        
        return result    