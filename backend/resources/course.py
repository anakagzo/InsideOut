from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required
from models import Course
from db import db
from schemas import CourseSchema
from utils.decorators import admin_required

blp = Blueprint("Courses", "courses", url_prefix="/courses")


@blp.route("/")
class CourseList(MethodView):

    @blp.response(200, CourseSchema(many=True))
    def get(self):
        return Course.query.all()

    @jwt_required()
    @admin_required
    @blp.arguments(CourseSchema)
    @blp.response(201, CourseSchema)
    def post(self, data):
        course = Course(**data)
        db.session.add(course)
        db.session.commit()
        return course
