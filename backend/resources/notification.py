"""Endpoints for managing email notification preferences."""

import logging
from flask import current_app
from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

from db import db
from models import EmailNotificationSettings, EmailNotification
from schemas import NotificationSchema, PaymentNotificationOutcomeListResponseSchema
from utils.decorators import admin_required

blp = Blueprint(
    "NotificationSettings",
    __name__,
    url_prefix="/notification-settings",
    description="Operations on email notification settings"
)
logger = logging.getLogger(__name__)
PAYMENT_NOTIFICATION_SUBJECTS = ("Payment confirmed", "Student payment confirmed")

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
        logger.info("Notification settings upsert requested", extra={"user_id": user_id})

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
            logger.info("Notification settings saved", extra={"user_id": user_id})

        except SQLAlchemyError:
            db.session.rollback()
            logger.exception("Notification settings save failed", extra={"user_id": user_id})
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
        logger.info("Notification settings read requested", extra={"user_id": user_id})

        settings = EmailNotificationSettings.query.filter_by(
            user_id=user_id
        ).first()

        # If no settings exist yet, return default values
        if not settings:
            settings = EmailNotificationSettings()
            settings.user_id = user_id
            settings.notify_on_new_payment = True
            settings.notify_on_schedule_change = True
            settings.notify_on_new_course = True
            settings.notify_on_meeting_reminder = True
            settings.meeting_reminder_lead_minutes = int(
                current_app.config.get("MEETING_REMINDER_DEFAULT_LEAD_MINUTES", 60)
            )

        return settings


@blp.route("/admin/payment-outcomes")
class PaymentNotificationOutcomes(MethodView):
    """Read recent payment notification outcomes from the email queue (admin only)."""

    @jwt_required()
    @admin_required
    @blp.response(200, PaymentNotificationOutcomeListResponseSchema)
    def get(self):
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 20, type=int)
        page_size = max(1, min(page_size, 100))
        status = request.args.get("status", "", type=str).strip().lower()

        query = EmailNotification.query.filter(EmailNotification.subject.in_(PAYMENT_NOTIFICATION_SUBJECTS))
        if status:
            query = query.filter(EmailNotification.status == status)

        pagination = query.order_by(EmailNotification.created_at.desc()).paginate(
            page=page,
            per_page=page_size,
            error_out=False,
        )

        return {
            "data": pagination.items,
            "pagination": {
                "page": pagination.page,
                "page_size": pagination.per_page,
                "total": pagination.total,
                "total_pages": pagination.pages,
            },
        }
