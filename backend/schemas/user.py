from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)
    first_name = fields.Str(required=True)
    last_name = fields.Str(required=True)
    initials = fields.Str(dump_only=True)
    phone_number = fields.Str()
    occupation = fields.Str()
    role = fields.Str(dump_only=True)
    created_at = fields.DateTime(dump_only=True)


class UserRegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    confirm_password = fields.Str(required=True, load_only=True)
    first_name = fields.Str(required=True)
    last_name = fields.Str(required=True)
    phone_number = fields.Str()
    occupation = fields.Str()

    @validates_schema
    def validate_passwords(self, data, **kwargs):
        if data["password"] != data["confirm_password"]:
            raise ValidationError("Passwords must match.")
        

class UserUpdateSchema(Schema):
    first_name = fields.Str()
    last_name = fields.Str()
    phone_number = fields.Str()
    occupation = fields.Str()


class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)


class ChangePasswordSchema(Schema):
    old_password = fields.Str(required=True)
    new_password = fields.Str(required=True)


class PaginationSchema(Schema):
    page = fields.Int()
    page_size = fields.Int()
    total = fields.Int()
    total_pages = fields.Int()


class UserListResponseSchema(Schema):
    data = fields.List(fields.Nested(UserSchema))
    pagination = fields.Nested(PaginationSchema)

