from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from schemas import AvailabilitySchema
from models import Availability
from db import db
from utils.decorators import admin_required

blp = Blueprint("Availability", "availability", url_prefix="/availability")


@blp.route("/")
class AvailabilityList(MethodView):

    @jwt_required()
    @admin_required
    @blp.arguments(AvailabilitySchema)
    @blp.response(201, AvailabilitySchema)
    def post(self, data):
        availability = Availability(**data)
        db.session.add(availability)
        db.session.commit()
        return availability
