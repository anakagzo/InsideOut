from datetime import datetime, timedelta

from db import db
from models.notification import EmailNotification, EmailNotificationSettings
from utils.notifications import process_meeting_reminders


def test_meeting_reminder_queues_for_student_and_tutor_by_default(
    app,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
):
    with app.app_context():
        app.config.update(
            MEETING_REMINDER_DEFAULT_LEAD_MINUTES=60,
            MEETING_REMINDER_MIN_LEAD_MINUTES=30,
            MEETING_REMINDER_MAX_LEAD_MINUTES=1440,
            MEETING_REMINDER_WINDOW_SECONDS=300,
        )

        tutor = create_user(role="admin", email="tutor-reminder@example.com")
        student = create_user(role="student", email="student-reminder@example.com")
        course = create_course(title="Reminder Course")
        enrollment = create_enrollment(student.id, course.id)

        reminder_start = (datetime.utcnow() + timedelta(minutes=60)).replace(second=0, microsecond=0)
        schedule = create_schedule(
            enrollment.id,
            date=reminder_start.date(),
            start_time=reminder_start.time(),
            end_time=(reminder_start + timedelta(hours=1)).time(),
        )

        processed = process_meeting_reminders()

        assert processed == 2
        recipients = [item.to_email for item in EmailNotification.query.all()]
        assert student.email in recipients
        assert tutor.email in recipients


def test_meeting_reminder_respects_user_settings_and_marks_processed(
    app,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    monkeypatch,
):
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(notifications_module, "queue_email", lambda to_email, subject, body, reference_key=None: queued.append((to_email, subject, body, reference_key)))

    with app.app_context():
        app.config.update(
            MEETING_REMINDER_DEFAULT_LEAD_MINUTES=60,
            MEETING_REMINDER_MIN_LEAD_MINUTES=30,
            MEETING_REMINDER_MAX_LEAD_MINUTES=1440,
            MEETING_REMINDER_WINDOW_SECONDS=300,
        )

        tutor = create_user(role="admin", email="tutor-off@example.com")
        student = create_user(role="student", email="student-off@example.com")
        course = create_course(title="Reminder Opt Out Course")
        enrollment = create_enrollment(student.id, course.id)

        student_settings = EmailNotificationSettings()
        student_settings.user_id = student.id
        student_settings.notify_on_meeting_reminder = True
        student_settings.meeting_reminder_lead_minutes = 30

        tutor_settings = EmailNotificationSettings()
        tutor_settings.user_id = tutor.id
        tutor_settings.notify_on_meeting_reminder = True
        tutor_settings.meeting_reminder_lead_minutes = 60

        db.session.add(student_settings)
        db.session.add(tutor_settings)
        db.session.commit()

        reminder_start = (datetime.utcnow() + timedelta(minutes=30)).replace(second=0, microsecond=0)
        schedule = create_schedule(
            enrollment.id,
            date=reminder_start.date(),
            start_time=reminder_start.time(),
            end_time=(reminder_start + timedelta(hours=1)).time(),
        )

        processed = process_meeting_reminders()

        assert processed == 1
        recipients = [item[0] for item in queued]
        assert student.email in recipients
        assert tutor.email not in recipients


def test_meeting_reminder_is_not_sent_twice(
    app,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
):
    with app.app_context():
        app.config.update(
            MEETING_REMINDER_DEFAULT_LEAD_MINUTES=60,
            MEETING_REMINDER_MIN_LEAD_MINUTES=30,
            MEETING_REMINDER_MAX_LEAD_MINUTES=1440,
            MEETING_REMINDER_WINDOW_SECONDS=300,
        )

        create_user(role="admin", email="tutor-dedup@example.com")
        student = create_user(role="student", email="student-dedup@example.com")
        course = create_course(title="Reminder Dedup Course")
        enrollment = create_enrollment(student.id, course.id)

        reminder_start = (datetime.utcnow() + timedelta(minutes=60)).replace(second=0, microsecond=0)
        create_schedule(
            enrollment.id,
            date=reminder_start.date(),
            start_time=reminder_start.time(),
            end_time=(reminder_start + timedelta(hours=1)).time(),
        )

        process_meeting_reminders()
        first_count = EmailNotification.query.count()
        process_meeting_reminders()
        second_count = EmailNotification.query.count()

        assert first_count > 0
        assert second_count == first_count