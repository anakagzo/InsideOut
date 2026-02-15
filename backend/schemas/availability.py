from datetime import datetime
from marshmallow import Schema, fields, validates_schema, ValidationError


def _current_month():
    return datetime.utcnow().month


class AvailabilityTimeSlotSchema(Schema):
    id = fields.Int(dump_only=True)
    start_time = fields.Time(required=True)
    end_time = fields.Time(required=True)


class AvailabilityDaySchema(Schema):
    id = fields.Int(dump_only=True)
    day_of_week = fields.Int(required=True)
    month_start = fields.Int(dump_only=True)
    month_end = fields.Int(dump_only=True)
    time_slots = fields.List(fields.Nested(AvailabilityTimeSlotSchema), required=True)


class AvailabilityUnavailableDateSchema(Schema):
    id = fields.Int(dump_only=True)
    unavailable_date = fields.Date(required=True)


class AvailabilityUpsertSchema(Schema):
    month_start = fields.Int(load_default=_current_month)
    month_end = fields.Int(load_default=_current_month)
    availability = fields.List(fields.Nested(AvailabilityDaySchema), required=True)
    unavailable_dates = fields.List(fields.Date(), load_default=[])

    @validates_schema
    def validate_month_range(self, data, **kwargs):
        month_start = data.get("month_start", _current_month())
        month_end = data.get("month_end", month_start)

        if month_start < 1 or month_start > 12:
            raise ValidationError("month_start must be between 1 and 12.", field_name="month_start")
        if month_end < 1 or month_end > 12:
            raise ValidationError("month_end must be between 1 and 12.", field_name="month_end")
        if month_end < month_start:
            raise ValidationError("month_end must be greater than or equal to month_start.", field_name="month_end")


class AvailabilitySchema(Schema):
    user_id = fields.Int(dump_only=True)
    month_start = fields.Int(dump_only=True)
    month_end = fields.Int(dump_only=True)
    availability = fields.List(fields.Nested(AvailabilityDaySchema), dump_only=True)
    unavailable_dates = fields.List(fields.Nested(AvailabilityUnavailableDateSchema), dump_only=True)
