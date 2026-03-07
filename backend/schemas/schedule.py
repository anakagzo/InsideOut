from marshmallow import Schema, fields


def _safe_course_title_from_obj(obj) -> str | None:
    if isinstance(obj, dict):
        course_title = obj.get("course_title")
        if isinstance(course_title, str):
            normalized = course_title.strip()
            return normalized or None

        enrollment = obj.get("enrollment")
        if isinstance(enrollment, dict):
            course = enrollment.get("course")
            if isinstance(course, dict):
                title = course.get("title")
                if isinstance(title, str):
                    normalized = title.strip()
                    return normalized or None
        return None

    enrollment = getattr(obj, "enrollment", None)
    course = getattr(enrollment, "course", None)
    title = getattr(course, "title", None)
    if isinstance(title, str):
        normalized = title.strip()
        return normalized or None
    return None


class ScheduleSchema(Schema):
    id = fields.Int(dump_only=True)
    enrollment_id = fields.Int(required=True)
    date = fields.Date(required=True)
    start_time = fields.Time(required=True)
    end_time = fields.Time(required=True)
    is_onboarding_booking = fields.Bool(load_only=True, allow_none=True, load_default=None)
    zoom_link = fields.Str(dump_only=True)
    status = fields.Str()
    course_title = fields.Method("get_course_title", dump_only=True)

    def get_course_title(self, obj):
        return _safe_course_title_from_obj(obj)


class ScheduleChangeRequestSchema(Schema):
    subject = fields.Str(required=True)
    comments = fields.Str(load_default="")


class ScheduleChangeRequestResponseSchema(Schema):
    message = fields.Str(required=True)
    schedule_id = fields.Int(required=True)
    queued_count = fields.Int(required=True)
