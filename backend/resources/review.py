"""Review endpoints for course feedback and tutor replies."""

import logging
from flask_smorest import Blueprint, abort
from flask.views import MethodView
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import admin_required, role_required
from models import Review, Course, Enrollment, User
from db import db
from schemas import ReviewSchema, ReviewCreateSchema, TutorReplySchema

blp = Blueprint(
    "Reviews",
    "reviews",
    url_prefix="/courses/<int:course_id>/reviews",
    description="Review operations"
)
logger = logging.getLogger(__name__)


def _get_course_or_404(course_id):
    logger.debug("Resolving course for reviews", extra={"course_id": course_id})
    course = db.session.get(Course, course_id)
    if not course:
        abort(404, message="Course not found.")
    return course


def _get_review_or_404(review_id):
    logger.debug("Resolving review", extra={"review_id": review_id})
    review = db.session.get(Review, review_id)
    if not review:
        abort(404, message="Review not found.")
    return review

@blp.route("/")
class ReviewList(MethodView):
    """Collection operations for course reviews."""

    @jwt_required()
    @role_required("student")
    @blp.arguments(ReviewCreateSchema)
    @blp.response(201, ReviewSchema)
    def post(self, review_data, course_id):
        """Create a review for a course if the user is enrolled and has not reviewed yet."""
        student_id = get_jwt_identity()
        logger.info("Review create requested", extra={"course_id": course_id, "student_id": student_id})

        course = _get_course_or_404(course_id)

        # Check enrollment
        enrollment = Enrollment.query.filter_by(
            student_id=student_id,
            course_id=course_id
        ).first()

        if not enrollment:
            abort(403, message="You must enroll before reviewing.")

        # Prevent duplicate review
        existing = Review.query.filter_by(
            user_id=student_id,
            course_id=course_id
        ).first()

        if existing:
            abort(400, message="You already reviewed this course.")

        review = Review()
        for field, value in review_data.items():
            setattr(review, field, value)
        review.user_id = student_id
        review.course_id = course_id

        db.session.add(review)
        db.session.commit()
        logger.info("Review created", extra={"course_id": course_id, "review_id": review.id, "student_id": student_id})

        return review
    
    @blp.response(200, ReviewSchema(many=True))
    def get(self, course_id):
        """Return all reviews for the specified course."""
        logger.info("Review list requested", extra={"course_id": course_id})
        return Review.query.filter_by(course_id=course_id).all()


@blp.route("/<int:review_id>/reply")
class TutorReplyResource(MethodView):
    """Tutor reply operations for reviews."""

    @jwt_required()
    @admin_required
    @blp.arguments(TutorReplySchema)
    @blp.response(200, ReviewSchema)
    def put(self, reply_data, course_id, review_id):
        """Set or update tutor reply for a review in the specified course."""
        logger.info("Tutor reply requested", extra={"course_id": course_id, "review_id": review_id})

        review = _get_review_or_404(review_id)
        _get_course_or_404(course_id)

        if review.course_id != course_id:
            abort(400, message="Review does not belong to the specified course.")

        review.tutor_reply = reply_data["tutor_reply"]
        db.session.commit()
        logger.info("Tutor reply saved", extra={"course_id": course_id, "review_id": review_id})

        return review

