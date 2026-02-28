import re

from marshmallow import Schema, fields, validates, validates_schema, ValidationError


PHONE_REGEX = re.compile(r"^[+]?[-()\s\d]{7,20}$")


def _validate_optional_phone_number(value: str | None):
    if value is None:
        return

    normalized = value.strip()
    if not normalized:
        return

    if not PHONE_REGEX.fullmatch(normalized):
        raise ValidationError("Invalid phone number format.")

    digits_only = re.sub(r"\D", "", normalized)
    if len(digits_only) < 7:
        raise ValidationError("Phone number must contain at least 7 digits.")


def _validate_non_empty_text(value: str | None, *, field_label: str):
    if value is None:
        return

    if not value.strip():
        raise ValidationError(f"{field_label} cannot be blank.")

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
    phone_number = fields.Str(allow_none=True)
    occupation = fields.Str()

    @validates_schema
    def validate_passwords(self, data, **kwargs):
        if data["password"] != data["confirm_password"]:
            raise ValidationError("Passwords must match.")

    @validates("phone_number")
    def validate_phone_number(self, value, **kwargs):
        _validate_optional_phone_number(value)

    @validates("first_name")
    def validate_first_name(self, value, **kwargs):
        _validate_non_empty_text(value, field_label="First name")

    @validates("last_name")
    def validate_last_name(self, value, **kwargs):
        _validate_non_empty_text(value, field_label="Last name")
        

class UserUpdateSchema(Schema):
    email = fields.Email()
    first_name = fields.Str()
    last_name = fields.Str()
    phone_number = fields.Str(allow_none=True)
    occupation = fields.Str()

    @validates("phone_number")
    def validate_phone_number(self, value, **kwargs):
        _validate_optional_phone_number(value)

    @validates("first_name")
    def validate_first_name(self, value, **kwargs):
        _validate_non_empty_text(value, field_label="First name")

    @validates("last_name")
    def validate_last_name(self, value, **kwargs):
        _validate_non_empty_text(value, field_label="Last name")


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

