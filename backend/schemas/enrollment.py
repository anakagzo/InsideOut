from marshmallow import Schema, fields

class EnrollmentSchema(Schema):
    id = fields.Int(dump_only=True)
    status = fields.Str()
    start_date = fields.DateTime()
    end_date = fields.DateTime()

    student = fields.Nested(lambda: UserSchema(only=("id", "initials", "email")), dump_only=True)
    course = fields.Nested(lambda: CourseSchema(only=("id", "title", "price")), dump_only=True)
    schedules = fields.Nested(lambda: ScheduleSchema(), many=True, dump_only=True)
