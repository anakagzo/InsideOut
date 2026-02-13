from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from models import Schedule
from schemas import ScheduleSchema
from db import db

blp = Blueprint("Schedules", "schedules", url_prefix="/schedules")


@blp.route("/")
class ScheduleList(MethodView):

    @jwt_required()
    @blp.response(200, ScheduleSchema(many=True))
    def get(self):
        return Schedule.query.all()
