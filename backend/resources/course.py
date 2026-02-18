"""Course resource endpoints.

This module exposes listing, creation, update, save, and schedule-retrieval
operations for courses.
"""

from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity
from models import Course, SavedCourse, Enrollment, Schedule, User
from db import db
from schemas import CourseSchema, CourseDetailSchema, CourseListResponseSchema, ScheduleSchema
from utils.decorators import admin_required
from utils.media_upload import MediaUploadService

blp = Blueprint("Courses", "courses", url_prefix="/courses")


from models import Review

from flask import request, current_app
from sqlalchemy import func, or_


def _default_course_image_url():
    """Return the configured default image URL for courses.

    Falls back to a local default media path when no explicit URL is configured.
    """
    configured_default = current_app.config.get("DEFAULT_COURSE_IMAGE_URL")
    if configured_default:
        return configured_default

    media_public_base_url = (current_app.config.get("MEDIA_PUBLIC_BASE_URL") or "").rstrip("/")
    if media_public_base_url:
        return f"{media_public_base_url}/defaults/course-default.png"

    return "/media/defaults/course-default.png"


def _get_course_or_404(course_id):
    course = db.session.get(Course, course_id)
    if not course:
        abort(404, message="Course not found.")
    return course


def _get_user_or_404(user_id):
    user = db.session.get(User, user_id)
    if not user:
        abort(404, message="User not found.")
    return user

@blp.route("/")
class CourseList(MethodView):
    """Collection operations for courses."""

    @blp.response(200, CourseListResponseSchema)
    def get(self):
        """List courses with optional search and enrollment-status filters."""
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 10, type=int)

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

        query = query.order_by(Course.created_at.desc())
        pagination = query.paginate(
            page=page,
            per_page=page_size,
            error_out=False
        )

        return {
            "data": pagination.items,
            "pagination": {
                "page": pagination.page,
                "page_size": pagination.per_page,
                "total": pagination.total,
                "total_pages": pagination.pages
            }
        }

    @jwt_required()
    @admin_required
    @blp.response(201, CourseSchema)
    def post(self):
        """Create a course from multipart form data and optional preview media."""
        is_multipart = (request.content_type or "").startswith("multipart/form-data")
        if not is_multipart:
            abort(400, message="Content-Type must be multipart/form-data.")

        data = request.form.to_dict()

        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        price = data.get("price")

        if not title:
            abort(400, message="title is required.")
        if not description:
            abort(400, message="description is required.")
        if price in (None, ""):
            abort(400, message="price is required.")

        image_url = _default_course_image_url()
        preview_video_url = None
        media_service = MediaUploadService.from_app(current_app)

        media_file = request.files.get("media")

        try:
            if media_file:
                uploaded_url = media_service.save_course_media(media_file)
                if media_file.mimetype and media_file.mimetype.startswith("image/"):
                    image_url = uploaded_url
                elif media_file.mimetype and media_file.mimetype.startswith("video/"):
                    preview_video_url = uploaded_url
        except ValueError as exc:
            abort(400, message=str(exc))
        except RuntimeError as exc:
            abort(500, message=str(exc))

        course = Course()
        course.title = title
        course.description = description
        course.price = price
        course.image_url = image_url
        course.preview_video_url = preview_video_url

        db.session.add(course)
        db.session.commit()
        return course


@blp.route("/<int:course_id>")
class CourseDetail(MethodView):
    """Read operations for a single course."""

    @blp.response(200, CourseDetailSchema)
    def get(self, course_id):
        """Retrieve a course with latest reviews attached."""

        course = _get_course_or_404(course_id)

        latest_reviews = (
            Review.query
            .filter_by(course_id=course_id)
            .order_by(Review.created_at.desc())
            .limit(3)
            .all()
        )

        return {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "image_url": course.image_url,
            "preview_video_url": course.preview_video_url,
            "price": course.price,
            "created_at": course.created_at,
            "average_rating": course.average_rating,
            "reviews": [
                {
                    "id": review.id,
                    "rating": review.rating,
                    "comment": review.comment,
                    "tutor_reply": review.tutor_reply,
                    "created_at": review.created_at,
                }
                for review in latest_reviews
            ],
        }


@blp.route("/<int:course_id>")
class CourseAdminEdit(MethodView):
    """Admin update and delete operations for a course."""

    @jwt_required(fresh=True)
    @admin_required
    @blp.response(200, CourseSchema)
    def put(self, course_id):
        """Update a course using multipart form fields and optional media upload."""
        course = _get_course_or_404(course_id)

        is_multipart = (request.content_type or "").startswith("multipart/form-data")
        if not is_multipart:
            abort(400, message="Content-Type must be multipart/form-data.")

        data = request.form.to_dict()

        if "title" in data:
            title = (data.get("title") or "").strip()
            if not title:
                abort(400, message="title cannot be empty.")
            course.title = title

        if "description" in data:
            description = (data.get("description") or "").strip()
            if not description:
                abort(400, message="description cannot be empty.")
            course.description = description

        if "price" in data:
            price = data.get("price")
            if price in (None, ""):
                abort(400, message="price cannot be empty.")
            course.price = price

        media_file = request.files.get("media")
        media_service = MediaUploadService.from_app(current_app)

        try:
            if media_file:
                uploaded_url = media_service.save_course_media(media_file)
                if media_file.mimetype and media_file.mimetype.startswith("image/"):
                    course.image_url = uploaded_url
                elif media_file.mimetype and media_file.mimetype.startswith("video/"):
                    course.preview_video_url = uploaded_url
        except ValueError as exc:
            abort(400, message=str(exc))
        except RuntimeError as exc:
            abort(500, message=str(exc))

        if not course.image_url:
            course.image_url = _default_course_image_url()

        db.session.commit()
        return course


    @jwt_required(fresh=True)
    @admin_required
    def delete(self, course_id):
        """Delete a course."""
        course = _get_course_or_404(course_id)

        db.session.delete(course)
        db.session.commit()

        return {"message": "Course deleted successfully."}, 200
    
    
@blp.route("/<int:course_id>/save")
class SaveCourse(MethodView):
    """Endpoint for students to save a course."""

    @jwt_required()
    def post(self, course_id):
        """Save a course for the current user if not already saved."""
        user_id = get_jwt_identity()

        _get_course_or_404(course_id)

        existing = SavedCourse.query.filter_by(
            user_id=user_id,
            course_id=course_id
        ).first()

        if existing:
            return {"message": "Course already saved."}, 200

        saved = SavedCourse()
        saved.user_id = user_id
        saved.course_id = course_id

        db.session.add(saved)
        db.session.commit()

        return {"message": "Course saved successfully."}, 201
    
@blp.route("/saved")
class SavedCoursesList(MethodView):
    """List saved courses for the current user."""

    @jwt_required()
    @blp.response(200, CourseListResponseSchema)
    def get(self):
        """Return paginated saved courses for the authenticated user."""

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 10, type=int)

        user_id = get_jwt_identity()

        query = (
            Course.query
            .join(SavedCourse, Course.id == SavedCourse.course_id)
            .filter(SavedCourse.user_id == user_id)
            .order_by(Course.created_at.desc())
        )

        pagination = query.paginate(
            page=page,
            per_page=page_size,
            error_out=False
        )

        return {
            "data": pagination.items,
            "pagination": {
                "page": pagination.page,
                "page_size": pagination.per_page,
                "total": pagination.total,
                "total_pages": pagination.pages
            }
        }


@blp.route("/<int:course_id>/schedules")
class CourseUserSchedules(MethodView):
    """Read schedules for the current user's enrollment in a course."""

    @jwt_required()
    @blp.response(200, ScheduleSchema(many=True))
    def get(self, course_id):
        """Return schedules for the caller scoped to the given course."""
        user_id = get_jwt_identity()
        _get_user_or_404(user_id)

        _get_course_or_404(course_id)

        schedules = (
            Schedule.query
            .join(Enrollment, Schedule.enrollment_id == Enrollment.id)
            .filter(
                Enrollment.course_id == course_id,
                Enrollment.student_id == user_id,
            )
            .order_by(Schedule.date.asc(), Schedule.start_time.asc())
            .all()
        )

        return schedules


