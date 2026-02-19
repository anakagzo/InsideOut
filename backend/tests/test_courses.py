from datetime import date, time

from db import db
from models.notification import EmailNotificationSettings


def test_list_courses_is_public(client, create_course):
    create_course(title="Course A")
    create_course(title="Course B")

    response = client.get("/courses/")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["pagination"]["total"] == 2
    assert len(payload["data"]) == 2


def test_admin_can_create_course_with_multipart(client, create_user, auth_headers):
    admin = create_user(role="admin")

    response = client.post(
        "/courses/",
        data={
            "title": "Advanced Python",
            "description": "Learn advanced Python",
            "price": "149.99",
        },
        headers=auth_headers(admin, fresh=True),
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "Advanced Python"
    assert data["image_url"]


def test_non_admin_cannot_create_course(client, create_user, auth_headers):
    student = create_user(role="student")

    response = client.post(
        "/courses/",
        data={"title": "Forbidden", "description": "Nope", "price": "10.00"},
        headers=auth_headers(student, fresh=True),
        content_type="multipart/form-data",
    )

    assert response.status_code == 403


def test_admin_can_update_and_delete_course(
    client,
    create_user,
    create_course,
    auth_headers,
):
    admin = create_user(role="admin")
    course = create_course(title="Original", price="25.00")

    update_response = client.put(
        f"/courses/{course.id}",
        data={"title": "Updated Title", "price": "50.00"},
        headers=auth_headers(admin, fresh=True),
        content_type="multipart/form-data",
    )
    assert update_response.status_code == 200
    assert update_response.get_json()["title"] == "Updated Title"

    delete_response = client.delete(
        f"/courses/{course.id}",
        headers=auth_headers(admin, fresh=True),
    )
    assert delete_response.status_code == 200


def test_student_can_save_and_list_saved_courses(
    client,
    create_user,
    create_course,
    auth_headers,
):
    student = create_user()
    course = create_course()

    save_response = client.post(
        f"/courses/{course.id}/save",
        headers=auth_headers(student),
    )
    assert save_response.status_code == 201

    second_save_response = client.post(
        f"/courses/{course.id}/save",
        headers=auth_headers(student),
    )
    assert second_save_response.status_code == 200

    list_response = client.get("/courses/saved", headers=auth_headers(student))
    assert list_response.status_code == 200
    payload = list_response.get_json()
    assert payload["pagination"]["total"] == 1
    assert payload["data"][0]["id"] == course.id


def test_type_filter_requires_auth_and_valid_value(client):
    unauthenticated_response = client.get("/courses/?type=active")
    assert unauthenticated_response.status_code == 401


def test_type_filter_rejects_invalid_value(client, create_user, auth_headers):
    user = create_user()
    response = client.get("/courses/?type=unknown", headers=auth_headers(user))
    assert response.status_code == 400


def test_course_user_schedules_are_scoped_to_current_user(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    student = create_user(email="student-a@example.com")
    other_student = create_user(email="student-b@example.com")
    course = create_course()

    student_enrollment = create_enrollment(student.id, course.id)
    other_enrollment = create_enrollment(other_student.id, course.id)

    create_schedule(
        student_enrollment.id,
        date=date.today(),
        start_time=time(9, 0),
        end_time=time(10, 0),
    )
    create_schedule(
        other_enrollment.id,
        date=date.today(),
        start_time=time(11, 0),
        end_time=time(12, 0),
    )

    response = client.get(
        f"/courses/{course.id}/schedules",
        headers=auth_headers(student),
    )

    assert response.status_code == 200
    schedules = response.get_json()
    assert len(schedules) == 1
    assert schedules[0]["start_time"] == "09:00:00"


def test_new_course_notification_respects_student_settings(
    client,
    app,
    create_user,
    auth_headers,
    monkeypatch,
):
    import utils.notifications as notifications_module

    queued = []
    monkeypatch.setattr(notifications_module, "queue_email", lambda to_email, subject, body: queued.append((to_email, subject, body)))

    admin = create_user(role="admin", email="admin-course-notify@example.com")
    student_opt_in = create_user(role="student", email="student-opt-in@example.com")
    student_opt_out = create_user(role="student", email="student-opt-out@example.com")

    with app.app_context():
        settings = EmailNotificationSettings()
        settings.user_id = student_opt_out.id
        settings.notify_on_new_course = False
        db.session.add(settings)
        db.session.commit()

    response = client.post(
        "/courses/",
        data={
            "title": "InsideOut Fresh Course",
            "description": "Brand new course",
            "price": "99.99",
        },
        headers=auth_headers(admin, fresh=True),
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    queued_emails = [entry[0] for entry in queued]
    assert student_opt_in.email in queued_emails
    assert student_opt_out.email not in queued_emails
