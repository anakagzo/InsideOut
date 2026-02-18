from marshmallow import Schema, fields


class CourseReviewSummarySchema(Schema):
    id = fields.Int(dump_only=True)
    rating = fields.Int(dump_only=True)
    comment = fields.Str(dump_only=True)
    tutor_reply = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


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
    reviews = fields.Nested(CourseReviewSummarySchema, many=True, dump_only=True)

'''
class CourseSingleResponseSchema(CourseDetailSchema):
    is_enrolled = fields.Boolean(dump_only=True)
    schedules = fields.List(
        fields.Dict(), 
        dump_only=True
    )
'''



class CoursePaginationSchema(Schema):
    page = fields.Int()
    page_size = fields.Int()
    total = fields.Int()
    total_pages = fields.Int()


class CourseListResponseSchema(Schema):
    data = fields.List(fields.Nested(CourseSchema))
    pagination = fields.Nested(CoursePaginationSchema)
