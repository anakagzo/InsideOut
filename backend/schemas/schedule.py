from marshmallow import Schema, fields

class ScheduleSchema(Schema):
    id = fields.Int(dump_only=True)
    enrollment_id = fields.Int(required=True, load_only=True)
    date = fields.Date(required=True)
    start_time = fields.Time(required=True)
    end_time = fields.Time(required=True)
    zoom_link = fields.Str(dump_only=True)
    status = fields.Str()


class ScheduleChangeRequestSchema(Schema):
    subject = fields.Str(required=True)
    comments = fields.Str(load_default="")


class ScheduleChangeRequestResponseSchema(Schema):
    message = fields.Str(required=True)
    schedule_id = fields.Int(required=True)
    queued_count = fields.Int(required=True)
