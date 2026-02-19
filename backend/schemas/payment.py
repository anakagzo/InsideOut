from marshmallow import Schema, fields


class StripeCheckoutSessionRequestSchema(Schema):
    course_id = fields.Int(required=True)


class StripeCheckoutSessionResponseSchema(Schema):
    session_id = fields.Str(required=True)
    checkout_url = fields.Str(required=True)
    publishable_key = fields.Str(required=True)


class StripeFinalizeRequestSchema(Schema):
    session_id = fields.Str(required=True)


class StripeFinalizeResponseSchema(Schema):
    message = fields.Str(required=True)
    enrollment_id = fields.Int(required=True)
    onboarding_token = fields.Str(required=True)


class OnboardingTokenValidateRequestSchema(Schema):
    token = fields.Str(required=True)
    course_id = fields.Int(required=True)


class OnboardingTokenValidateResponseSchema(Schema):
    valid = fields.Bool(required=True)
    expired = fields.Bool(required=True)
    message = fields.Str(required=True)
    enrollment_id = fields.Int(allow_none=True)
