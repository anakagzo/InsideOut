def test_register_login_and_get_profile(client):
    register_payload = {
        "email": "student@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "first_name": "Test",
        "last_name": "Student",
        "phone_number": "123456789",
        "occupation": "Learner",
    }

    register_response = client.post("/auth/register", json=register_payload)
    assert register_response.status_code == 201
    register_data = register_response.get_json()
    assert "access_token" in register_data
    assert "refresh_token" in register_data

    login_response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "Password123!"},
    )
    assert login_response.status_code == 200
    login_data = login_response.get_json()

    me_response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )
    assert me_response.status_code == 200
    me_data = me_response.get_json()
    assert me_data["email"] == "student@example.com"


def test_register_duplicate_email_returns_409(client, create_user):
    create_user(email="exists@example.com")

    response = client.post(
        "/auth/register",
        json={
            "email": "exists@example.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "first_name": "A",
            "last_name": "B",
        },
    )

    assert response.status_code == 409


def test_login_invalid_credentials_returns_401(client, create_user):
    create_user(email="student@example.com", password="Password123!")

    response = client.post(
        "/auth/login",
        json={"email": "student@example.com", "password": "WrongPassword"},
    )

    assert response.status_code == 401


def test_change_password_requires_fresh_token(client, create_user, auth_headers):
    student = create_user(password="Password123!")

    response = client.put(
        "/me/change_password",
        json={"old_password": "Password123!", "new_password": "NewPassword123!"},
        headers=auth_headers(student, fresh=False),
    )

    assert response.status_code == 401


def test_change_password_success(client, create_user, auth_headers):
    student = create_user(email="pwd@example.com", password="Password123!")

    response = client.put(
        "/me/change_password",
        json={"old_password": "Password123!", "new_password": "NewPassword123!"},
        headers=auth_headers(student, fresh=True),
    )
    assert response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"email": "pwd@example.com", "password": "NewPassword123!"},
    )
    assert login_response.status_code == 200


def test_refresh_rotates_tokens(client, create_user):
    create_user(email="refresh@example.com", password="Password123!")
    login_response = client.post(
        "/auth/login",
        json={"email": "refresh@example.com", "password": "Password123!"},
    )
    refresh_token = login_response.get_json()["refresh_token"]

    refresh_response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert refresh_response.status_code == 200
    refreshed_data = refresh_response.get_json()
    assert "access_token" in refreshed_data
    assert "refresh_token" in refreshed_data

    second_refresh_response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert second_refresh_response.status_code == 401


def test_logout_revokes_current_access_token(client, create_user, auth_headers):
    student = create_user()
    headers = auth_headers(student)

    logout_response = client.post("/auth/logout", headers=headers)
    assert logout_response.status_code == 200

    profile_response = client.get("/me", headers=headers)
    assert profile_response.status_code == 401


def test_admin_can_list_and_delete_users(client, create_user, auth_headers):
    admin = create_user(role="admin", email="admin@example.com")
    student = create_user(email="student1@example.com")
    create_user(email="student2@example.com")

    list_response = client.get("/users", headers=auth_headers(admin))
    assert list_response.status_code == 200
    users_data = list_response.get_json()
    assert users_data["pagination"]["total"] >= 2

    delete_response = client.delete(
        f"/users/{student.id}",
        headers=auth_headers(admin, fresh=True),
    )
    assert delete_response.status_code == 200


def test_non_admin_cannot_list_users(client, create_user, auth_headers):
    student = create_user(role="student")
    response = client.get("/users", headers=auth_headers(student))
    assert response.status_code == 403
