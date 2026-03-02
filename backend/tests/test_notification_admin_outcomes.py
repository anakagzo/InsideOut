from db import db
from models.notification import EmailNotification


def _create_email_notification(*, to_email: str, subject: str, status: str = "pending", last_error: str | None = None):
    email = EmailNotification()
    email.to_email = to_email
    email.subject = subject
    email.body = "<p>Test</p>"
    email.status = status
    email.retry_count = 0
    email.last_error = last_error
    db.session.add(email)
    db.session.commit()
    return email


def test_admin_can_list_payment_notification_outcomes(client, app, create_user, auth_headers):
    admin = create_user(role="admin", email="outcome-admin@example.com")

    with app.app_context():
        _create_email_notification(
            to_email="student@example.com",
            subject="Payment confirmed",
            status="sent",
        )
        _create_email_notification(
            to_email="admin@example.com",
            subject="Student payment confirmed",
            status="failed",
            last_error="temporary failure",
        )
        _create_email_notification(
            to_email="other@example.com",
            subject="Schedule confirmed",
            status="sent",
        )

    response = client.get(
        "/notification-settings/admin/payment-outcomes",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["pagination"]["total"] == 2
    assert len(payload["data"]) == 2

    subjects = {item["subject"] for item in payload["data"]}
    assert "Payment confirmed" in subjects
    assert "Student payment confirmed" in subjects
    assert "Schedule confirmed" not in subjects


def test_student_cannot_list_payment_notification_outcomes(client, app, create_user, auth_headers):
    student = create_user(role="student", email="outcome-student@example.com")

    response = client.get(
        "/notification-settings/admin/payment-outcomes",
        headers=auth_headers(student),
    )

    assert response.status_code == 403
