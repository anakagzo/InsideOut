"""Notification dispatch helpers built on top of queued email delivery."""

import logging
from datetime import date, datetime, timedelta
from datetime import UTC

from flask import current_app

from models import Schedule, User
from utils.email import queue_email

logger = logging.getLogger(__name__)


def _is_notification_enabled(user: User, setting_field: str) -> bool:
    settings = user.notification_settings
    if settings is None:
        return True

    value = getattr(settings, setting_field, True)
    return True if value is None else bool(value)


def _queue_user_notification(user: User, setting_field: str, subject: str, body: str) -> bool:
    outcome = _queue_user_notification_outcome(user, setting_field, subject, body)
    return outcome == "queued"


def _queue_user_notification_outcome(
    user: User,
    setting_field: str,
    subject: str,
    body: str,
    reference_key: str | None = None,
) -> str:
    if not _is_notification_enabled(user, setting_field):
        logger.info(
            "Notification skipped by user settings",
            extra={"user_id": user.id, "setting_field": setting_field},
        )
        return "skipped"

    try:
        if reference_key is None:
            queue_email(user.email, subject, body)
        else:
            queue_email(user.email, subject, body, reference_key=reference_key)
        return "queued"
    except Exception:
        logger.exception(
            "Failed to queue user notification",
            extra={"user_id": user.id, "setting_field": setting_field},
        )
        return "error"


def _student_and_admin_recipients(student: User) -> list[User]:
    recipients_by_id: dict[int, User] = {student.id: student}
    for admin in User.query.filter(User.role == "admin").all():
        recipients_by_id[admin.id] = admin
    return list(recipients_by_id.values())


def _meeting_reminder_bounds() -> tuple[int, int, int]:
    default_lead = int(current_app.config.get("MEETING_REMINDER_DEFAULT_LEAD_MINUTES", 60))
    min_lead = int(current_app.config.get("MEETING_REMINDER_MIN_LEAD_MINUTES", 30))
    max_lead = int(current_app.config.get("MEETING_REMINDER_MAX_LEAD_MINUTES", 1440))

    min_lead = max(1, min_lead)
    max_lead = max(min_lead, max_lead)
    default_lead = max(min_lead, min(default_lead, max_lead))
    return default_lead, min_lead, max_lead


def _meeting_reminder_lead_minutes(user: User) -> int:
    default_lead, min_lead, max_lead = _meeting_reminder_bounds()
    settings = user.notification_settings
    if settings is None:
        return default_lead

    value = getattr(settings, "meeting_reminder_lead_minutes", default_lead)
    if value is None:
        return default_lead

    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return default_lead

    return max(min_lead, min(numeric, max_lead))


def notify_payment_confirmed(student: User, course_title: str) -> int:
    recipients = _student_and_admin_recipients(student)
    queued_count = 0

    for recipient in recipients:
        if recipient.id == student.id:
            subject = "Payment confirmed"
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>Your payment for <strong>{course_title}</strong> was confirmed successfully.</p>"
                "<p>You can now continue with onboarding and schedule your first session.</p>"
            )
        else:
            subject = "Student payment confirmed"
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>A payment for <strong>{course_title}</strong> was confirmed.</p>"
                f"<p><strong>Student:</strong> {student.first_name} {student.last_name}</p>"
            )

        if _queue_user_notification(recipient, "notify_on_new_payment", subject, body):
            queued_count += 1

    return queued_count


def notify_schedule_created(student: User, course_title: str, schedule_count: int, first_date: date | None) -> int:
    plural = "s" if schedule_count != 1 else ""
    date_hint = f" starting on <strong>{first_date.isoformat()}</strong>" if first_date else ""
    recipients = _student_and_admin_recipients(student)
    queued_count = 0

    for recipient in recipients:
        if recipient.id == student.id:
            subject = "Schedule confirmed"
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>Your schedule for <strong>{course_title}</strong> has been updated.</p>"
                f"<p>{schedule_count} session{plural} were created{date_hint}.</p>"
            )
        else:
            subject = "Student schedule created"
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>A schedule for <strong>{course_title}</strong> has been created.</p>"
                f"<p><strong>Student:</strong> {student.first_name} {student.last_name}<br/>"
                f"<strong>Sessions:</strong> {schedule_count}</p>"
            )

        if _queue_user_notification(recipient, "notify_on_schedule_change", subject, body):
            queued_count += 1

    return queued_count


def notify_new_course_published(course_title: str) -> int:
    recipients = User.query.filter(User.role == "student").all()
    if not recipients:
        return 0

    queued_count = 0
    for user in recipients:
        subject = "New course available"
        body = (
            f"<p>Hi {user.first_name},</p>"
            f"<p>A new course <strong>{course_title}</strong> is now available on InsideOut.</p>"
            "<p>Log in to explore the new content.</p>"
        )
        if _queue_user_notification(user, "notify_on_new_course", subject, body):
            queued_count += 1

    logger.info("Queued new-course notifications", extra={"course_title": course_title, "queued_count": queued_count})
    return queued_count


def _queue_meeting_reminder_for_schedule(schedule: Schedule, now: datetime, window_seconds: int) -> int:
    enrollment = schedule.enrollment
    if not enrollment or not enrollment.student:
        return 0

    student = enrollment.student
    recipients = _student_and_admin_recipients(student)

    start_at = datetime.combine(schedule.date, schedule.start_time)
    if start_at <= now:
        return 0

    date_label = schedule.date.isoformat()
    time_label = schedule.start_time.strftime("%H:%M")
    course_title = enrollment.course.title if enrollment.course else "your course"

    queued_count = 0
    for recipient in recipients:
        lead_minutes = _meeting_reminder_lead_minutes(recipient)
        target = start_at - timedelta(minutes=lead_minutes)
        window_start = target - timedelta(seconds=window_seconds)
        window_end = target + timedelta(seconds=window_seconds)

        if now < window_start or now > window_end:
            continue

        subject = f"Meeting reminder: starts in {lead_minutes} minute(s)"
        if recipient.id == student.id:
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>This is a reminder that your session for <strong>{course_title}</strong> starts in {lead_minutes} minute(s).</p>"
                f"<p><strong>Date:</strong> {date_label}<br/><strong>Time:</strong> {time_label}</p>"
            )
        else:
            body = (
                f"<p>Hi {recipient.first_name},</p>"
                f"<p>Reminder: a session for <strong>{course_title}</strong> starts in {lead_minutes} minute(s).</p>"
                f"<p><strong>Student:</strong> {student.first_name} {student.last_name}<br/>"
                f"<strong>Date:</strong> {date_label}<br/><strong>Time:</strong> {time_label}</p>"
            )

        reference_key = f"meeting-reminder:{schedule.id}:{recipient.id}:{lead_minutes}"
        outcome = _queue_user_notification_outcome(
            recipient,
            "notify_on_meeting_reminder",
            subject,
            body,
            reference_key=reference_key,
        )

        if outcome == "queued":
            queued_count += 1

    return queued_count


def process_meeting_reminders() -> int:
    window_seconds = max(15, int(current_app.config.get("MEETING_REMINDER_WINDOW_SECONDS", 90)))
    _, _, max_lead_minutes = _meeting_reminder_bounds()

    now = datetime.now(UTC).replace(tzinfo=None)
    latest_start = now + timedelta(minutes=max_lead_minutes, seconds=window_seconds)
    candidate_dates = {now.date(), latest_start.date()}
    candidates = (
        Schedule.query
        .filter(
            Schedule.status == "scheduled",
            Schedule.date.in_(candidate_dates),
        )
        .all()
    )

    reminder_count = 0
    for schedule in candidates:
        reminder_count += _queue_meeting_reminder_for_schedule(schedule, now, window_seconds)

    if reminder_count:
        logger.info("Meeting reminders queued", extra={"count": reminder_count})

    return reminder_count
