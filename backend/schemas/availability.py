from marshmallow import Schema, fields

class AvailabilitySchema(Schema):
    id = fields.Int(dump_only=True)
    day_of_week = fields.Int()
    start_time = fields.Time()
    end_time = fields.Time()
    month_start = fields.Int()
    month_end = fields.Int()
    specific_date_override = fields.Date()
