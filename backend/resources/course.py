from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from models import Course, SavedCourse, Enrollment
from db import db
from schemas import CourseSchema, CourseDetailSchema, CourseSingleResponseSchema
from utils.decorators import admin_required

blp = Blueprint("Courses", "courses", url_prefix="/courses")


from models import Review

from flask import request
from sqlalchemy import func, or_

@blp.route("/")
class CourseList(MethodView):
    @blp.paginate()
    @blp.response(200, CourseSchema(many=True))
    def get(self, pagination_parameters):
        # custom query parameters for search and filtering
        search = request.args.get("search", "").strip()
        type_filter = request.args.get("type")

        query = Course.query

        if type_filter:
            verify_jwt_in_request()
            user_id = get_jwt_identity()

            if type_filter not in ["active", "completed"]:
                abort(400, message="Invalid type filter. Must be 'active' or 'completed'")

            query = (
                query
                .join(Enrollment, Course.id == Enrollment.course_id)
                .filter(Enrollment.student_id == user_id, Enrollment.status == type_filter)
            )

        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    Course.title.ilike(term),
                    Course.description.ilike(term)
                )
            )

        return query.order_by(Course.created_at.desc())

    @jwt_required()
    @admin_required
    @blp.arguments(CourseSchema)
    @blp.response(201, CourseSchema)
    def post(self, data):
        course = Course(**data)
        db.session.add(course)
        db.session.commit()
        return course


@blp.route("/<int:course_id>")
class CourseDetail(MethodView):

    @blp.response(200, CourseDetailSchema)
    def get(self, course_id):

        course = Course.query.get_or_404(course_id)

        # attach latest 3 reviews
        course.reviews = (
            Review.query
            .filter_by(course_id=course_id)
            .order_by(Review.created_at.desc())
            .limit(3)
            .all()
        )

        return course


@blp.route("/<int:course_id>")
class CourseAdminEdit(MethodView):

    @jwt_required(fresh=True)
    @admin_required
    @blp.arguments(CourseSchema)
    @blp.response(200, CourseSchema)
    def put(self, data, course_id):
        course = Course.query.get_or_404(course_id)

        for key, value in data.items():
            setattr(course, key, value)

        db.session.commit()
        return course


    @jwt_required(fresh=True)
    @admin_required
    def delete(self, course_id):
        course = Course.query.get_or_404(course_id)

        db.session.delete(course)
        db.session.commit()

        return {"message": "Course deleted successfully."}, 200
    
    
@blp.route("/<int:course_id>/save")
class SaveCourse(MethodView):

    @jwt_required()
    def post(self, course_id):
        user_id = get_jwt_identity()

        Course.query.get_or_404(course_id)

        existing = SavedCourse.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).first()

        if existing:
            return {"message": "Course already saved."}, 200

        saved = SavedCourse(
            user_id=user_id,
            course_id=course_id
        )

        db.session.add(saved)
        db.session.commit()

        return {"message": "Course saved successfully."}, 201
    
@blp.route("/saved")
class SavedCoursesList(MethodView):

    @jwt_required()
    @blp.paginate()
    @blp.response(200, CourseSchema(many=True))
    def get(self, pagination_parameters):

        user_id = get_jwt_identity()

        query = (
            Course.query
            .join(SavedCourse, Course.id == SavedCourse.course_id)
            .filter(SavedCourse.user_id == user_id)
            .order_by(Course.created_at.desc())
        )

        return query


