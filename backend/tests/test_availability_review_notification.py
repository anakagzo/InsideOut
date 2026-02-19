from datetime import date, time


def test_admin_can_upsert_and_get_availability(client, create_user, auth_headers):
    admin = create_user(role="admin")
    payload = {
        "month_start": 2,
        "month_end": 3,
        "availability": [
            {
                "day_of_week": 1,
                "time_slots": [
                    {"start_time": "09:00:00", "end_time": "10:00:00"},
                    {"start_time": "10:30:00", "end_time": "11:30:00"},
                ],
            }
        ],
        "unavailable_dates": [date(2026, 2, 18).isoformat()],
    }

    upsert_response = client.post(
        "/availability/",
        json=payload,
        headers=auth_headers(admin),
    )
    assert upsert_response.status_code == 201

    get_response = client.get("/availability/", headers=auth_headers(admin))
    assert get_response.status_code == 200
    data = get_response.get_json()
    assert data["user_id"] == admin.id
    assert len(data["availability"]) == 1


def test_availability_rejects_overlapping_slots(client, create_user, auth_headers):
    admin = create_user(role="admin")
    payload = {
        "month_start": 2,
        "month_end": 2,
        "availability": [
            {
                "day_of_week": 2,
                "time_slots": [
                    {"start_time": "09:00:00", "end_time": "10:00:00"},
                    {"start_time": "09:30:00", "end_time": "11:00:00"},
                ],
            }
        ],
        "unavailable_dates": [],
    }

    response = client.post("/availability/", json=payload, headers=auth_headers(admin))
    assert response.status_code == 400


def test_student_cannot_manage_availability(client, create_user, auth_headers):
    student = create_user(role="student")
    response = client.get("/availability/", headers=auth_headers(student))
    assert response.status_code == 403


def test_student_can_read_public_availability_with_booked_slots(
    client,
    create_user,
    create_course,
    create_enrollment,
    create_schedule,
    auth_headers,
):
    admin = create_user(role="admin", email="admin-public@example.com")
    student = create_user(role="student", email="student-public@example.com")

    upsert_response = client.post(
        "/availability/",
        json={
            "month_start": 2,
            "month_end": 3,
            "availability": [
                {
                    "day_of_week": 1,
                    "time_slots": [
                        {"start_time": "09:00:00", "end_time": "10:00:00"},
                    ],
                }
            ],
            "unavailable_dates": [date(2026, 2, 18).isoformat()],
        },
        headers=auth_headers(admin),
    )
    assert upsert_response.status_code == 201

    course = create_course()
    enrollment = create_enrollment(student.id, course.id)
    create_schedule(
        enrollment.id,
        date=date(2026, 2, 17),
        start_time=time(9, 0),
        end_time=time(10, 0),
    )

    response = client.get("/availability/public", headers=auth_headers(student))

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["month_start"] == 2
    assert len(payload["availability"]) == 1
    assert payload["unavailable_dates"] == [date(2026, 2, 18).isoformat()]
    matching_slot = next((slot for slot in payload["booked_slots"] if slot["date"] == date(2026, 2, 17).isoformat()), None)
    assert matching_slot is not None
    assert matching_slot["start_time"] == "09:00:00"
    assert matching_slot["end_time"] == "10:00:00"


def test_student_can_create_review_once_when_enrolled(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user(role="student")
    course = create_course()
    create_enrollment(student.id, course.id)

    create_response = client.post(
        f"/courses/{course.id}/reviews/",
        json={"rating": 5, "comment": "Great course"},
        headers=auth_headers(student),
    )
    assert create_response.status_code == 201

    duplicate_response = client.post(
        f"/courses/{course.id}/reviews/",
        json={"rating": 4, "comment": "Another review"},
        headers=auth_headers(student),
    )
    assert duplicate_response.status_code == 400


def test_student_cannot_review_without_enrollment(
    client,
    create_user,
    create_course,
    auth_headers,
):
    student = create_user(role="student")
    course = create_course()

    response = client.post(
        f"/courses/{course.id}/reviews/",
        json={"rating": 4, "comment": "Looks good"},
        headers=auth_headers(student),
    )
    assert response.status_code == 403


def test_review_list_is_public(client, create_course):
    course = create_course()
    response = client.get(f"/courses/{course.id}/reviews/")
    assert response.status_code == 200
    assert response.get_json() == []


def test_admin_can_reply_to_review_as_tutor(
    client,
    create_user,
    create_course,
    create_enrollment,
    auth_headers,
):
    student = create_user(role="student", email="student@example.com")
    responder = create_user(role="admin", email="admin@example.com")
    course = create_course()
    create_enrollment(student.id, course.id)

    create_response = client.post(
        f"/courses/{course.id}/reviews/",
        json={"rating": 5, "comment": "Solid"},
        headers=auth_headers(student),
    )
    review_id = create_response.get_json()["id"]

    reply_response = client.put(
        f"/courses/{course.id}/reviews/{review_id}/reply",
        json={"tutor_reply": "Thanks"},
        headers=auth_headers(responder),
    )
    assert reply_response.status_code == 200
    assert reply_response.get_json()["tutor_reply"] == "Thanks"


def test_notification_settings_upsert_and_get(
    client,
    create_user,
    auth_headers,
):
    user = create_user()

    post_response = client.post(
        "/notification-settings/",
        json={
            "user_id": user.id,
            "notify_on_new_payment": False,
            "notify_on_schedule_change": True,
            "notify_on_new_course": False,
            "notify_on_meeting_reminder": True,
            "meeting_reminder_lead_minutes": 45,
        },
        headers=auth_headers(user),
    )

    assert post_response.status_code == 200

    get_response = client.get("/notification-settings/me", headers=auth_headers(user))
    assert get_response.status_code == 200
    payload = get_response.get_json()
    assert payload["user_id"] == user.id
    assert payload["notify_on_new_payment"] is False
    assert payload["meeting_reminder_lead_minutes"] == 45


def test_notification_settings_get_returns_defaults_when_missing(
    client,
    create_user,
    auth_headers,
):
    user = create_user()
    response = client.get("/notification-settings/me", headers=auth_headers(user))

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["user_id"] == user.id
    assert payload["meeting_reminder_lead_minutes"] == 60
