from marshmallow import Schema, fields
from .schedule import ScheduleSchema


class EnrollmentStudentSchema(Schema):
    id = fields.Int(dump_only=True)
    initials = fields.Str(dump_only=True)
    first_name = fields.Str(dump_only=True)
    last_name = fields.Str(dump_only=True)
    email = fields.Email(dump_only=True)


class EnrollmentCourseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(dump_only=True)
    price = fields.Decimal(dump_only=True)


class EnrollmentSchema(Schema):
    id = fields.Int(dump_only=True)
    student_id = fields.Int(required=True, load_only=True)  # For input
    course_id = fields.Int(required=True, load_only=True)   # For input
    status = fields.Str()
    start_date = fields.DateTime()
    end_date = fields.DateTime()

    student = fields.Nested(EnrollmentStudentSchema, dump_only=True)
    course = fields.Nested(EnrollmentCourseSchema, dump_only=True)
    schedules = fields.Nested(lambda: ScheduleSchema(), many=True, dump_only=True)


class ScheduleItemSchema(Schema):
    """Schema for individual schedule items within a grouped date"""
    id = fields.Int(dump_only=True)
    date = fields.Date(dump_only=True)
    start_time = fields.Time(dump_only=True)
    end_time = fields.Time(dump_only=True)
    zoom_link = fields.Str(allow_none=True)
    status = fields.Str()


class GroupedScheduleSchema(Schema):
    """Schema for schedules grouped by date"""
    date = fields.Date(dump_only=True)
    schedules = fields.Nested(ScheduleItemSchema, many=True, dump_only=True)


class EnrollmentPaginationSchema(Schema):
    page = fields.Int()
    page_size = fields.Int()
    total = fields.Int()
    total_pages = fields.Int()


class EnrollmentListResponseSchema(Schema):
    data = fields.List(fields.Nested(EnrollmentSchema))
    pagination = fields.Nested(EnrollmentPaginationSchema)
