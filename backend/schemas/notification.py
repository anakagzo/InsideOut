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
