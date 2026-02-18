"""Availability management endpoints for admin users."""

import logging
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import get_jwt_identity, jwt_required
from datetime import datetime, timezone
from schemas import AvailabilitySchema, AvailabilityUpsertSchema
from models import Availability, AvailabilityTimeSlot, AvailabilityUnavailableDate, User
from db import db
from utils.decorators import admin_required

blp = Blueprint("Availability", "availability", url_prefix="/availability")
logger = logging.getLogger(__name__)


def _get_user_or_404(user_id):
    logger.debug("Resolving user for availability", extra={"user_id": user_id})
    user = db.session.get(User, user_id)
    if not user:
        abort(404, message="User not found.")
    return user


@blp.route("/")
class AvailabilityList(MethodView):
    """Create and read availability configuration for the authenticated admin."""

    @jwt_required()
    @admin_required
    @blp.response(200, AvailabilitySchema)
    def get(self):
        """Return the current availability window, time slots, and unavailable dates."""
        user_id = int(get_jwt_identity())
        logger.info("Availability read requested", extra={"user_id": user_id})
        admin_user = _get_user_or_404(user_id)

        availability_days = (
            Availability.query.filter_by(user_id=user_id)
            .order_by(Availability.day_of_week.asc())
            .all()
        )
        unavailable_dates = (
            AvailabilityUnavailableDate.query.filter_by(user_id=user_id)
            .order_by(AvailabilityUnavailableDate.unavailable_date.asc())
            .all()
        )

        month_start = availability_days[0].month_start if availability_days else None
        month_end = availability_days[0].month_end if availability_days else None

        return {
            "user_id": admin_user.id,
            "month_start": month_start,
            "month_end": month_end,
            "availability": availability_days,
            "unavailable_dates": unavailable_dates,
        }

    @jwt_required()
    @admin_required
    @blp.arguments(AvailabilityUpsertSchema)
    @blp.response(201, AvailabilitySchema)
    def post(self, data):
        """Replace availability data using an upsert/diff strategy per weekday/date."""
        # Identify caller and enforce admin-only write access.
        user_id = int(get_jwt_identity())
        logger.info("Availability upsert requested", extra={"user_id": user_id})
        admin_user = _get_user_or_404(user_id)

        if admin_user.role != "admin":
            abort(403, message="Only admins can manage availability.")

        # Read request payload with safe defaults.
        availability_payload = data.get("availability", [])
        unavailable_dates_payload = data.get("unavailable_dates", [])
        current_month = datetime.now(timezone.utc).month
        month_start = data.get("month_start", current_month)
        month_end = data.get("month_end", month_start)

        # Validate configured month window.
        if month_start < 1 or month_start > 12:
            abort(400, message="month_start must be between 1 and 12.")
        if month_end < 1 or month_end > 12:
            abort(400, message="month_end must be between 1 and 12.")
        if month_end < month_start:
            abort(400, message="month_end must be greater than or equal to month_start.")

        if not availability_payload:
            abort(400, message="At least one day of availability is required.")

        # Validate day keys and prevent duplicate weekday definitions.
        day_keys = [item.get("day_of_week") for item in availability_payload]
        if any(day is None or day < 1 or day > 7 for day in day_keys):
            abort(400, message="Each day_of_week must be between 1 and 7.")

        if len(day_keys) != len(set(day_keys)):
            abort(400, message="Duplicate day_of_week values are not allowed.")

        # Build existing-day index and delete weekdays removed by the client.
        existing_days = Availability.query.filter_by(user_id=user_id).all()
        existing_days_by_week = {day.day_of_week: day for day in existing_days}
        incoming_day_keys = set(day_keys)

        for day in existing_days:
            if day.day_of_week not in incoming_day_keys:
                db.session.delete(day)

        for day_item in availability_payload:
            # Validate and normalize slots before persisting.
            slots_payload = day_item.get("time_slots", [])
            if not slots_payload:
                abort(400, message="Each availability day must include at least one time slot.")

            sorted_slots = sorted(slots_payload, key=lambda x: x["start_time"])
            for index, slot in enumerate(sorted_slots):
                if slot["start_time"] >= slot["end_time"]:
                    abort(400, message="Each time slot must have start_time earlier than end_time.")

                if index > 0 and sorted_slots[index - 1]["end_time"] > slot["start_time"]:
                    abort(400, message="Overlapping time slots are not allowed within the same day.")

            day_of_week = day_item["day_of_week"]
            day_record = existing_days_by_week.get(day_of_week)

            if day_record is None:
                # Insert new weekday row when missing.
                day_record = Availability()
                day_record.user_id = user_id
                day_record.day_of_week = day_of_week
                db.session.add(day_record)

            # Keep month range in sync and replace slots for this day atomically.
            day_record.month_start = month_start
            day_record.month_end = month_end
            day_record.time_slots.clear()

            for slot in sorted_slots:
                slot_record = AvailabilityTimeSlot()
                slot_record.start_time = slot["start_time"]
                slot_record.end_time = slot["end_time"]
                day_record.time_slots.append(
                    slot_record
                )

        # Diff unavailable dates: validate input, remove stale rows, add new rows.
        unique_dates = sorted(set(unavailable_dates_payload))
        existing_unavailable_dates = AvailabilityUnavailableDate.query.filter_by(user_id=user_id).all()
        existing_unavailable_by_date = {
            item.unavailable_date: item for item in existing_unavailable_dates
        }
        incoming_unavailable_dates = set(unique_dates)

        for unavailable_date in unique_dates:
            if unavailable_date.month < month_start or unavailable_date.month > month_end:
                abort(
                    400,
                    message="unavailable_dates must be within the configured month_start and month_end range.",
                )

        for item in existing_unavailable_dates:
            if item.unavailable_date not in incoming_unavailable_dates:
                db.session.delete(item)

        for unavailable_date in unique_dates:
            if unavailable_date not in existing_unavailable_by_date:
                unavailable_record = AvailabilityUnavailableDate()
                unavailable_record.user_id = user_id
                unavailable_record.unavailable_date = unavailable_date
                db.session.add(unavailable_record)

        # Commit once so all changes succeed or fail together.
        db.session.commit()
        logger.info("Availability upsert completed", extra={"user_id": user_id})

        # Return canonical, ordered state after persistence.
        availability_days = (
            Availability.query.filter_by(user_id=user_id)
            .order_by(Availability.day_of_week.asc())
            .all()
        )
        unavailable_dates = (
            AvailabilityUnavailableDate.query.filter_by(user_id=user_id)
            .order_by(AvailabilityUnavailableDate.unavailable_date.asc())
            .all()
        )

        return {
            "user_id": admin_user.id,
            "month_start": month_start,
            "month_end": month_end,
            "availability": availability_days,
            "unavailable_dates": unavailable_dates,
        }
