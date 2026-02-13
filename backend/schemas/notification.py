from marshmallow import Schema, fields

class NotificationSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    notify_on_new_payment = fields.Bool()
    notify_on_schedule_change = fields.Bool()
    notify_on_new_course = fields.Bool()
    notify_on_meeting_reminder = fields.Bool()
