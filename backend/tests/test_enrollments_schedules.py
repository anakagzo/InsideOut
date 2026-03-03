from datetime import UTC, date, datetime, timedelta

from db import db
from models.notification import EmailNotification
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


def test_admin_cannot_create_enrollment(
    client,
    create_user,
    create_course,
    auth_headers,
):
    admin = create_user(role="admin")
    course = create_course()

    response = client.post(
        "/enrollments/",
        json={"student_id": admin.id, "course_id": course.id},
        headers=auth_headers(admin),
    )

    assert response.status_code == 403


def test_unauthenticated_user_cannot_create_enrollment(
    client,
    create_user,
    create_course,
):
    student = create_user()
    course = create_course()

    response = client.post(
        "/enrollments/",
        json={"student_id": student.id, "course_id": course.id},
    )

    assert response.status_code == 401


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

    enrollment_response = client.get(f"/enrollments/{enrollment.id}", headers=auth_headers(student))
    assert enrollment_response.status_code == 200
    enrollment_payload = enrollment_response.get_json()
    assert enrollment_payload["start_date"].startswith(future_date.isoformat())
    assert enrollment_payload["end_date"].startswith(future_date.isoformat())


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


def test_admin_can_create_schedule_for_student_enrollment(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    admin = create_user(role="admin")
    student = create_user(email="student-schedule-owner@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")

    response = client.post(
        "/schedules/",
        json=[
            {
                "enrollment_id": enrollment.id,
                "date": (date.today() + timedelta(days=3)).isoformat(),
                "start_time": "10:00:00",
                "end_time": "10:30:00",
            }
        ],
        headers=auth_headers(admin),
    )

    assert response.status_code == 201


def test_admin_mark_completed_requires_confirmation_when_future_classes_exist(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    admin = create_user(role="admin")
    student = create_user(email="student-complete-check@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")
    create_schedule(
        enrollment.id,
        date=date.today() + timedelta(days=5),
    )

    response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed"},
        headers=auth_headers(admin),
    )

    assert response.status_code == 409
    payload = response.get_json()
    assert "upcoming classes" in payload.get("message", "").lower()

    confirmed_response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed", "force_complete": True},
        headers=auth_headers(admin),
    )

    assert confirmed_response.status_code == 200
    confirmed_payload = confirmed_response.get_json()
    assert confirmed_payload["status"] == "completed"
    assert confirmed_payload["provider_invalidation_targets"] >= 0
    assert confirmed_payload["provider_invalidation_succeeded"] >= 0
    assert confirmed_payload["blocked_reminders_count"] >= 0


def test_force_complete_blocks_queued_meeting_reminder_emails(
    client,
    app,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    admin = create_user(role="admin")
    student = create_user(email="student-block-reminder@example.com")
    course = create_course()
    enrollment = create_enrollment(student.id, course.id, status="active")
    schedule = create_schedule(
        enrollment.id,
        date=date.today() + timedelta(days=2),
        zoom_link="https://zoom.us/j/11111111111",
    )

    with app.app_context():
        queued_email = EmailNotification()
        queued_email.to_email = student.email
        queued_email.subject = "Meeting reminder"
        queued_email.body = "<p>Reminder</p>"
        queued_email.reference_key = f"meeting-reminder:{schedule.id}:{student.id}:60"
        queued_email.status = "pending"
        db.session.add(queued_email)
        db.session.commit()

    response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed", "force_complete": True},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    response_payload = response.get_json()
    assert response_payload["blocked_reminders_count"] >= 1

    with app.app_context():
        updated_email = EmailNotification.query.filter_by(reference_key=f"meeting-reminder:{schedule.id}:{student.id}:60").first()
        assert updated_email is None

        blocked_rows = EmailNotification.query.filter(EmailNotification.to_email == student.email).all()
        assert blocked_rows
        assert any(row.status == "failed" and "completed early" in (row.last_error or "") for row in blocked_rows)


def test_revert_completed_enrollment_to_active_unblocks_meeting_reminders(
    client,
    app,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    from utils.notifications import process_meeting_reminders

    admin = create_user(role="admin", email="admin-unblock-reminders@example.com")
    student = create_user(email="student-unblock-reminders@example.com")
    course = create_course(title="Reminder Reopen Course")
    enrollment = create_enrollment(student.id, course.id, status="active")

    reminder_start = (datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=60)).replace(second=0, microsecond=0)
    schedule = create_schedule(
        enrollment.id,
        date=reminder_start.date(),
        start_time=reminder_start.time(),
        end_time=(reminder_start + timedelta(hours=1)).time(),
    )

    with app.app_context():
        app.config.update(
            MEETING_REMINDER_DEFAULT_LEAD_MINUTES=60,
            MEETING_REMINDER_MIN_LEAD_MINUTES=60,
            MEETING_REMINDER_MAX_LEAD_MINUTES=60,
            MEETING_REMINDER_WINDOW_SECONDS=300,
        )

        blocked_email = EmailNotification()
        blocked_email.to_email = student.email
        blocked_email.subject = "Meeting reminder"
        blocked_email.body = "<p>Reminder</p>"
        blocked_email.reference_key = f"meeting-reminder:{schedule.id}:{student.id}:60"
        blocked_email.status = "pending"
        db.session.add(blocked_email)
        db.session.commit()

    force_complete_response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed", "force_complete": True},
        headers=auth_headers(admin),
    )
    assert force_complete_response.status_code == 200

    reactivate_response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "active"},
        headers=auth_headers(admin),
    )
    assert reactivate_response.status_code == 200

    with app.app_context():
        queued_count = process_meeting_reminders()
        assert queued_count >= 1

        requeued = EmailNotification.query.filter(
            EmailNotification.reference_key == f"meeting-reminder:{schedule.id}:{student.id}:60",
            EmailNotification.status == "pending",
        ).first()
        assert requeued is not None


def test_completion_invalidates_provider_links_and_clears_schedule_links(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
    monkeypatch,
):
    import resources.enrollment as enrollment_module

    invalidated_links = []
    monkeypatch.setattr(
        enrollment_module,
        "invalidate_zoom_meeting_link",
        lambda link: invalidated_links.append(link) or True,
    )

    admin = create_user(role="admin", email="admin-provider-invalidate@example.com")
    student = create_user(email="student-provider-invalidate@example.com")
    course = create_course(title="Provider Invalidation Course")
    enrollment = create_enrollment(student.id, course.id, status="active")

    shared_link = "https://zoom.us/j/12312312312"
    create_schedule(enrollment.id, date=date.today() + timedelta(days=1), zoom_link=shared_link)
    create_schedule(enrollment.id, date=date.today() + timedelta(days=2), zoom_link=shared_link)

    response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed", "force_complete": True},
        headers=auth_headers(admin),
    )

    assert response.status_code == 200
    response_payload = response.get_json()
    assert response_payload["provider_invalidation_targets"] == 1
    assert response_payload["provider_invalidation_succeeded"] == 1
    assert invalidated_links == [shared_link]

    schedules_response = client.get("/schedules/", headers=auth_headers(student))
    assert schedules_response.status_code == 200
    payload = schedules_response.get_json()
    assert len(payload) == 2
    assert all(item["zoom_link"] is None for item in payload)


def test_reactivate_generates_new_meeting_link_for_upcoming_schedules(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
    monkeypatch,
):
    import resources.enrollment as enrollment_module

    invalidated_links = []
    monkeypatch.setattr(
        enrollment_module,
        "invalidate_zoom_meeting_link",
        lambda link: invalidated_links.append(link) or True,
    )

    created_topics = []
    refreshed_link = "https://zoom.us/j/99988877766"

    def _fake_create_zoom_meeting_link(*, topic):
        created_topics.append(topic)
        return refreshed_link

    monkeypatch.setattr(enrollment_module, "create_zoom_meeting_link", _fake_create_zoom_meeting_link)

    admin = create_user(role="admin", email="admin-reactivate-link@example.com")
    student = create_user(email="student-reactivate-link@example.com")
    course = create_course(title="Reactivation Course")
    enrollment = create_enrollment(student.id, course.id, status="active")

    old_link = "https://zoom.us/j/11122233344"
    create_schedule(enrollment.id, date=date.today() + timedelta(days=1), zoom_link=old_link)
    create_schedule(enrollment.id, date=date.today() + timedelta(days=2), zoom_link=old_link)

    complete_response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "completed", "force_complete": True},
        headers=auth_headers(admin),
    )
    assert complete_response.status_code == 200

    reactivate_response = client.put(
        f"/enrollments/{enrollment.id}",
        json={"status": "active"},
        headers=auth_headers(admin),
    )
    assert reactivate_response.status_code == 200
    reactivate_payload = reactivate_response.get_json()
    assert reactivate_payload["links_refreshed_count"] == 2
    assert reactivate_payload["blocked_reminders_count"] == 0

    assert invalidated_links == [old_link]
    assert len(created_topics) == 1

    schedules_response = client.get("/schedules/", headers=auth_headers(student))
    assert schedules_response.status_code == 200
    payload = schedules_response.get_json()
    assert len(payload) == 2
    assert all(item["zoom_link"] == refreshed_link for item in payload)


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
