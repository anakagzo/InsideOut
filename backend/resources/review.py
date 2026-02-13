from flask_smorest import Blueprint, abort
from flask.views import MethodView
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import role_required
from models import Review, Course, Enrollment, User
from db import db
from schemas import ReviewSchema, ReviewCreateSchema, TutorReplySchema

blp = Blueprint(
    "Reviews",
    "reviews",
    url_prefix="/courses/<int:course_id>/reviews",
    description="Review operations"
)

@blp.route("/")
class ReviewList(MethodView):

    @jwt_required()
    @role_required("student")
    @blp.arguments(ReviewCreateSchema)
    @blp.response(201, ReviewSchema)
    def post(self, review_data, course_id):
        student_id = get_jwt_identity()

        course = Course.query.get_or_404(course_id)

        # Check enrollment
        enrollment = Enrollment.query.filter_by(
            student_id=student_id,
            course_id=course_id
        ).first()

        if not enrollment:
            abort(403, message="You must enroll before reviewing.")

        # Prevent duplicate review
        existing = Review.query.filter_by(
            student_id=student_id,
            course_id=course_id
        ).first()

        if existing:
            abort(400, message="You already reviewed this course.")

        review = Review(
            **review_data,
            student_id=student_id,
            course_id=course_id
        )

        db.session.add(review)
        db.session.commit()

        return review
    
    @blp.response(200, ReviewSchema(many=True))
    def get(self, course_id):
        return Review.query.filter_by(course_id=course_id).all()


@blp.route("/<int:review_id>/reply")
class TutorReplyResource(MethodView):

    @jwt_required()
    @role_required("tutor")
    @blp.arguments(TutorReplySchema)
    @blp.response(200, ReviewSchema)
    def put(self, reply_data, course_id, review_id):
        tutor_id = get_jwt_identity()

        review = Review.query.get_or_404(review_id)
        course = Course.query.get_or_404(course_id)

        # Ensure tutor owns the course
        if course.tutor_id != tutor_id:
            abort(403, message="You do not own this course.")

        review.tutor_reply = reply_data["tutor_reply"]
        db.session.commit()

        return review

