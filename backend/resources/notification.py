"""Endpoints for managing email notification preferences."""

from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

from db import db
from models import EmailNotificationSettings
from schemas import NotificationSchema

blp = Blueprint(
    "NotificationSettings",
    __name__,
    url_prefix="/notification-settings",
    description="Operations on email notification settings"
)

@blp.route("/")
class EmailNotificationSettingsUpsert(MethodView):
    """Create or update notification settings for the current user."""

    @jwt_required()
    @blp.arguments(NotificationSchema)
    @blp.response(200, NotificationSchema)
    def post(self, settings_data):
        """
        Create or update the current user's email notification settings.
        """

        user_id = get_jwt_identity()

        settings = EmailNotificationSettings.query.filter_by(
            user_id=user_id
        ).first()

        try:
            if settings:
                # Update only provided fields
                for field, value in settings_data.items():
                    setattr(settings, field, value)
            else:
                # Create new settings
                settings = EmailNotificationSettings()
                settings.user_id = user_id
                for field, value in settings_data.items():
                    setattr(settings, field, value)
                db.session.add(settings)

            db.session.commit()

        except SQLAlchemyError:
            db.session.rollback()
            abort(500, message="Failed to save notification settings.")

        return settings

@blp.route("/me")
class EmailNotificationSettingsGet(MethodView):
    """Read notification settings for the current user."""

    @jwt_required()
    @blp.response(200, NotificationSchema)
    def get(self):
        """Return persisted settings or model defaults when not configured yet."""
        user_id = get_jwt_identity()

        settings = EmailNotificationSettings.query.filter_by(
            user_id=user_id
        ).first()

        # If no settings exist yet, return default values
        if not settings:
            settings = EmailNotificationSettings()
            settings.user_id = user_id

        return settings
