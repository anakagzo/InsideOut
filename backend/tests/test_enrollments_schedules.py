from datetime import date, timedelta

from db import db
from models.notification import EmailNotificationSettings


def test_student_can_create_own_enrollment(
    client,
    create_user,
    create_course,
    auth_headers,
):
    student = create_user()
    course = create_course()

    response = client.post(
        "/enrollments/",
        json={"student_id": student.id, "course_id": course.id},
        headers=auth_headers(student),
    )

    assert response.status_code == 201


def test_student_cannot_create_enrollment_for_another_user(
    client,
    create_user,
    create_course,
    auth_headers,
):
    student = create_user()
    other_student = create_user(email="other@example.com")
    course = create_course()

    response = client.post(
        "/enrollments/",
        json={"student_id": other_student.id, "course_id": course.id},
        headers=auth_headers(student),
    )

    assert response.status_code == 403


def test_admin_can_list_enrollments(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    admin = create_user(role="admin")
    student = create_user()
    course = create_course(title="Python Basics")
    create_enrollment(student.id, course.id)

    response = client.get("/enrollments/?search=Python", headers=auth_headers(admin))
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["pagination"]["total"] == 1


def test_enrollment_detail_access_control(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user(email="owner@example.com")
    other_student = create_user(email="other@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id)

    owner_response = client.get(
        f"/enrollments/{enrollment.id}",
        headers=auth_headers(student),
    )
    assert owner_response.status_code == 200

    forbidden_response = client.get(
        f"/enrollments/{enrollment.id}",
        headers=auth_headers(other_student),
    )
    assert forbidden_response.status_code == 403


def test_admin_can_delete_enrollment(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    admin = create_user(role="admin")
    student = create_user()
    course = create_course()
    enrollment = create_enrollment(student.id, course.id)

    response = client.delete(
        f"/enrollments/{enrollment.id}",
        headers=auth_headers(admin, fresh=True),
    )

    assert response.status_code == 200


def test_schedule_creation_updates_enrollment_dates_and_status(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user()
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")

    future_date = date.today() + timedelta(days=7)
    response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment.id,
                "date": future_date.isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            }
        ],
        headers=auth_headers(student),
    )

    assert response.status_code == 201

    grouped_response = client.get("/enrollments/schedules", headers=auth_headers(student))
    assert grouped_response.status_code == 200
    grouped_payload = grouped_response.get_json()
    assert len(grouped_payload) == 1
    assert grouped_payload[0]["date"] == future_date.isoformat()


def test_schedule_creation_rejects_mixed_enrollments(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user()
    course1 = create_course(title="A")
    course2 = create_course(title="B")

    enrollment1 = create_enrollment(student.id, course1.id)
    enrollment2 = create_enrollment(student.id, course2.id)

    response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment1.id,
                "date": (date.today() + timedelta(days=1)).isoformat(),
                "start_time": "09:00:00",
                "end_time": "10:00:00",
            },
            {
                "enrollment_id": enrollment2.id,
                "date": (date.today() + timedelta(days=2)).isoformat(),
                "start_time": "11:00:00",
                "end_time": "12:00:00",
            },
        ],
        headers=auth_headers(student),
    )

    assert response.status_code == 400


def test_schedule_detail_is_scoped_to_owner(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    owner = create_user(email="owner@example.com")
    other = create_user(email="other@example.com")
    course = create_course()

    enrollment = create_enrollment(owner.id, course.id)
    schedule = create_schedule(enrollment.id)

    owner_response = client.get(
        f"/schedules/{schedule.id}",
        headers=auth_headers(owner),
    )
    assert owner_response.status_code == 200

    forbidden_response = client.get(
        f"/schedules/{schedule.id}",
        headers=auth_headers(other),
    )
    assert forbidden_response.status_code == 404


def test_schedule_create_skips_email_when_schedule_notifications_disabled(
    client,
    app,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
    monkeypatch,
):
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(notifications_module, "queue_email", lambda to_email, subject, body: queued.append((to_email, subject, body)))

    admin = create_user(role="admin", email="schedule-notify-admin@example.com")
    student = create_user(email="schedule-notify-off@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")

    with app.app_context():
        settings = EmailNotificationSettings()
        settings.user_id = student.id
        settings.notify_on_schedule_change = False
        db.session.add(settings)
        db.session.commit()

    response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment.id,
                "date": (date.today() + timedelta(days=7)).isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            }
        ],
        headers=auth_headers(student),
    )

    assert response.status_code == 201
    recipients = {item[0] for item in queued}
    assert student.email not in recipients
    assert admin.email in recipients


def test_schedule_creation_reuses_same_zoom_link_per_enrollment(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
    monkeypatch,
):
    import resources.schedule as schedule_module

    created_topics = []
    shared_link = "https://zoom.us/j/12345678901"

    def _fake_create_zoom_meeting_link(*, topic):
        created_topics.append(topic)
        return shared_link

    monkeypatch.setattr(schedule_module, "create_zoom_meeting_link", _fake_create_zoom_meeting_link)

    student = create_user(email="zoom-student@example.com")
    course = create_course(title="Zoom Course")
    enrollment = create_enrollment(student.id, course.id, status="active")

    first_response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment.id,
                "date": (date.today() + timedelta(days=3)).isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            },
            {
                "enrollment_id": enrollment.id,
                "date": (date.today() + timedelta(days=4)).isoformat(),
                "start_time": "10:00:00",
                "end_time": "11:00:00",
            },
        ],
        headers=auth_headers(student),
    )
    assert first_response.status_code == 201
    first_payload = first_response.get_json()
    assert all(item["zoom_link"] == shared_link for item in first_payload)
    assert len(created_topics) == 1

    second_response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment.id,
                "date": (date.today() + timedelta(days=5)).isoformat(),
                "start_time": "13:00:00",
                "end_time": "14:00:00",
            }
        ],
        headers=auth_headers(student),
    )
    assert second_response.status_code == 201
    second_payload = second_response.get_json()
    assert second_payload[0]["zoom_link"] == shared_link
    assert len(created_topics) == 1


def test_admin_can_refresh_enrollment_zoom_link(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
    monkeypatch,
):
    import resources.schedule as schedule_module

    admin = create_user(role="admin", email="zoom-admin@example.com")
    student = create_user(email="zoom-owner@example.com")
    course = create_course(title="Refresh Zoom Course")
    enrollment = create_enrollment(student.id, course.id, status="active")
    create_schedule(enrollment.id, zoom_link="https://zoom.us/j/11111111111")
    create_schedule(enrollment.id, zoom_link="https://zoom.us/j/11111111111", date=date.today() + timedelta(days=2))

    refreshed_link = "https://zoom.us/j/99999999999"
    monkeypatch.setattr(
        schedule_module,
        "create_zoom_meeting_link",
        lambda *, topic: refreshed_link,
    )

    response = client.post(
        f"/schedules/enrollments/{enrollment.id}/refresh-zoom-link",
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["enrollment_id"] == enrollment.id
    assert payload["zoom_link"] == refreshed_link
    assert payload["updated_count"] == 2

    schedules_response = client.get("/schedules/", headers=auth_headers(student))
    assert schedules_response.status_code == 200
    schedules_payload = schedules_response.get_json()
    assert len(schedules_payload) == 2
    assert all(item["zoom_link"] == refreshed_link for item in schedules_payload)


def test_non_admin_cannot_refresh_enrollment_zoom_link(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user(email="zoom-no-admin@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")

    response = client.post(
        f"/schedules/enrollments/{enrollment.id}/refresh-zoom-link",
        headers=auth_headers(student),
    )

    assert response.status_code == 403


def test_student_can_request_schedule_change_and_admin_is_emailed(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
    monkeypatch,
):
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(
        notifications_module,
        "queue_email",
        lambda to_email, subject, body, reference_key=None: queued.append((to_email, subject, body, reference_key)),
    )

    admin = create_user(role="admin", email="schedule-change-admin@example.com")
    student = create_user(email="schedule-change-student@example.com")
    course = create_course(title="Schedule Change Course")
    enrollment = create_enrollment(student.id, course.id, status="active")
    schedule = create_schedule(enrollment.id)

    response = client.post(
        f"/schedules/{schedule.id}/request-change",
        json={"subject": "Need to move session", "comments": "Please move to next week."},
        headers=auth_headers(student),
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["schedule_id"] == schedule.id
    assert payload["queued_count"] == 1

    detail_response = client.get(f"/schedules/{schedule.id}", headers=auth_headers(student))
    assert detail_response.status_code == 200
    detail_payload = detail_response.get_json()
    assert detail_payload["status"] == "reschedule_requested"

    recipients = [item[0] for item in queued]
    assert admin.email in recipients
