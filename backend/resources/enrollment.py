from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import admin_required
from models import Enrollment
from db import db
from schemas import EnrollmentSchema

blp = Blueprint("Enrollments", "enrollments", url_prefix="/enrollments")


@blp.route("/")
class EnrollmentList(MethodView):
    @jwt_required()
    @admin_required
    @blp.response(200, EnrollmentSchema(many=True))
    def get(self):
        user_id = int(get_jwt_identity())
        return Enrollment.query.filter_by(student_id=user_id).all()


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