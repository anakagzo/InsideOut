from marshmallow import Schema, fields

class CourseSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    image_url = fields.Str(allow_none=True)
    description = fields.Str(required=True)
    price = fields.Decimal(as_string=True, required=True)   
    created_at = fields.DateTime()
    reviews = fields.List(
        fields.Nested(lambda: ReviewSchema(only=("id", "rating", "comment"))),
        dump_only=True
    )

    students = fields.List(fields.Nested(lambda: UserSchema(
        exclude=("password","enrolled_courses", "reviews", "schedules", "created_at", "is_admin", "enrollments"))),
        dump_only=True)
    enrollments = fields.List(fields.Nested(lambda: EnrollmentSchema(exclude=("student", "course"))), dump_only=True)

class EmailNotificationSettingsSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    notify_on_new_payment = fields.Bool()
    notify_on_schedule_change = fields.Bool()
    notify_on_new_course = fields.Bool()
    notify_on_meeting_reminder = fields.Bool()

class EnrollmentSchema(Schema):
    id = fields.Int(dump_only=True)
    student_id = fields.Int(required=True)
    course_id = fields.Int(required=True)
    enrollment_date = fields.DateTime(required=True)
    status = fields.Str(required=True)
    end_date = fields.DateTime(allow_none=True)
    meeting_id = fields.Str(required=True)
    meeting_link = fields.Str(required=True)
    student = fields.Nested(lambda: UserSchema(
        exclude=("password","enrolled_courses", "reviews", "schedules", "created_at", "is_admin", "enrollments") ),
        dump_only=True)
    course = fields.Nested(lambda: CourseSchema(
        exclude=("students", "enrollments", "reviews")
    ), dump_only=True)  
    schedules = fields.List(fields.Nested(lambda: ScheduleSchema()), dump_only=True)

class ReviewSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    course_id = fields.Int(required=True)
    rating = fields.Int(required=True)
    comment = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    user = fields.Nested(lambda: UserSchema(
        exclude=("password","enrolled_courses", "reviews", "schedules", "created_at", "is_admin", "enrollments")),
         dump_only=True)
    course = fields.Nested(lambda: CourseSchema(exclude=("students", "enrollments", "reviews")), dump_only=True)

class ScheduleSchema(Schema):
    id = fields.Int(dump_only=True)
    user_id = fields.Int(required=True)
    enrollment_id = fields.Int(required=True)
    scheduled_date = fields.DateTime(required=True) 
    enrollment = fields.Nested(EnrollmentSchema(exclude=("student", "course", "schedules")), dump_only=True)
    user = fields.Nested(lambda: UserSchema(
        exclude=("password","enrolled_courses", "reviews", "schedules", "created_at", "is_admin", "enrollments")), 
        dump_only=True)


class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    profile_image_url = fields.Str(allow_none=True)
    first_name = fields.Str(allow_none=True)
    last_name = fields.Str(allow_none=True)
    account_name = fields.Str(allow_none=True)
    phone_number = fields.Str(allow_none=True)
    is_admin = fields.Bool()
    created_at = fields.DateTime()
    enrolled_courses = fields.List(fields.Nested(CourseSchema(exclude=("students", "enrollments", "reviews"))), dump_only=True)
    enrollments = fields.List(fields.Nested(EnrollmentSchema(exclude=("student", "course", "schedules"))), dump_only=True)
    schedules = fields.List(fields.Nested(ScheduleSchema(exclude=("user", "enrollment"))), dump_only=True)
    reviews = fields.List(fields.Nested(lambda: ReviewSchema(exclude=("user", "course"))), dump_only=True)


class UserUpdateSchema(Schema):
    first_name = fields.Str()
    last_name = fields.Str()
    profile_image_url = fields.Url()
    phone_number = fields.Str()
    occupation = fields.Str()

class UserRegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, load_only=True)
    first_name = fields.Str()

class UserResponseSchema(Schema):
    id = fields.Int(dump_only=True)
    email = fields.Email()
    first_name = fields.Str()
