from marshmallow import Schema, fields, validate


class NotificationSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    notify_on_new_payment = fields.Bool()
    notify_on_schedule_change = fields.Bool()
    notify_on_new_course = fields.Bool()
    notify_on_meeting_reminder = fields.Bool()
    meeting_reminder_lead_minutes = fields.Int(
        validate=validate.Range(min=30, max=1440),
        load_default=60,
        dump_default=60,
    )


class PaymentNotificationOutcomeSchema(Schema):
    id = fields.Int(dump_only=True)
    to_email = fields.Email(dump_only=True)
    subject = fields.Str(dump_only=True)
    status = fields.Str(dump_only=True)
    retry_count = fields.Int(dump_only=True)
    last_error = fields.Str(allow_none=True, dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    sent_at = fields.DateTime(allow_none=True, dump_only=True)


class PaymentNotificationOutcomePaginationSchema(Schema):
    page = fields.Int(dump_only=True)
    page_size = fields.Int(dump_only=True)
    total = fields.Int(dump_only=True)
    total_pages = fields.Int(dump_only=True)


class PaymentNotificationOutcomeListResponseSchema(Schema):
    data = fields.List(fields.Nested(PaymentNotificationOutcomeSchema), dump_only=True)
    pagination = fields.Nested(PaymentNotificationOutcomePaginationSchema, dump_only=True)
