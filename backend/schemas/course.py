from marshmallow import Schema, fields
from . import ReviewSchema


class CourseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    image_url = fields.Str()
    preview_video_url = fields.Str()
    price = fields.Decimal(required=True)
    created_at = fields.DateTime(dump_only=True)

    average_rating = fields.Float(dump_only=True)



class CourseDetailSchema(CourseSchema):
    reviews = fields.Nested(
        lambda: ReviewSchema(only=(
            "id", "rating", "comment", "tutor_reply", "created_at")
            ), many=True, dump_only=True)

class CourseSingleResponseSchema(CourseDetailSchema):
    is_enrolled = fields.Boolean(dump_only=True)
    schedules = fields.List(
        fields.Dict(), 
        dump_only=True
    )


class CoursePaginationSchema(Schema):
    page = fields.Int()
    page_size = fields.Int()
    total = fields.Int()
    total_pages = fields.Int()


class CourseListResponseSchema(Schema):
    data = fields.List(fields.Nested(CourseSchema))
    pagination = fields.Nested(CoursePaginationSchema)
