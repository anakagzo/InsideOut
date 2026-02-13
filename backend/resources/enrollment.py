from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Enrollment
from db import db
from schemas import EnrollmentSchema

blp = Blueprint("Enrollments", "enrollments", url_prefix="/enrollments")


@blp.route("/")
class EnrollmentList(MethodView):

    @jwt_required()
    @blp.response(200, EnrollmentSchema(many=True))
    def get(self):
        user_id = int(get_jwt_identity())
        return Enrollment.query.filter_by(student_id=user_id).all()

    @jwt_required()
    @blp.arguments(EnrollmentSchema)
    @blp.response(201, EnrollmentSchema)
    def post(self, data):
        enrollment = Enrollment(**data)
        db.session.add(enrollment)
        db.session.commit()
        return enrollment
