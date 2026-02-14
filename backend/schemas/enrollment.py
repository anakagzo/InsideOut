from marshmallow import Schema, fields
from schemas import CourseSchema, UserSchema, ScheduleSchema


class EnrollmentSchema(Schema):
    id = fields.Int(dump_only=True)
    student_id = fields.Int(required=True, load_only=True)  # For input
    course_id = fields.Int(required=True, load_only=True)   # For input
    status = fields.Str()
    start_date = fields.DateTime()
    end_date = fields.DateTime()

    student = fields.Nested(lambda: UserSchema(only=("id", "initials", "email")), dump_only=True)
    course = fields.Nested(lambda: CourseSchema(only=("id", "title", "price")), dump_only=True)
    schedules = fields.Nested(lambda: ScheduleSchema(), many=True, dump_only=True)
