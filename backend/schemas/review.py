from marshmallow import Schema, fields, validate


class ReviewAuthorSchema(Schema):
    id = fields.Int(dump_only=True)
    initials = fields.Str(dump_only=True)

class ReviewSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(load_only=True)
    course_id = fields.Int(load_only=True)
    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    comment = fields.Str()
    tutor_reply = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)

    author = fields.Nested(ReviewAuthorSchema, dump_only=True)

class ReviewCreateSchema(Schema):
    rating = fields.Integer(required=True, validate=validate.Range(min=1, max=5))
    comment = fields.String(required=True)

class TutorReplySchema(Schema):
    tutor_reply = fields.String(required=True)



