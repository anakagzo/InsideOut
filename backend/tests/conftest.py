from datetime import UTC, date, datetime, time, timedelta
from itertools import count
from pathlib import Path
import sys

import pytest
from flask_jwt_extended import create_access_token, create_refresh_token
from passlib.hash import pbkdf2_sha256


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)

for path_item in (str(REPO_ROOT), str(BACKEND_DIR)):
    if path_item not in sys.path:
        sys.path.insert(0, path_item)

from app import create_app
from blocklist import BLOCKLIST
from db import db
from models import Course, Enrollment, Schedule, User


@pytest.fixture()
def app(tmp_path):
    database_path = tmp_path / "test.db"
    media_dir = tmp_path / "uploads"

    BLOCKLIST.clear()

    flask_app = create_app(db_url=f"sqlite:///{database_path.as_posix()}")
    flask_app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="insideout-test-jwt-secret-key-minimum-32-bytes",
        MEDIA_STORAGE_DRIVER="local",
        MEDIA_LOCAL_UPLOAD_DIR=str(media_dir),
    )

    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()

    BLOCKLIST.clear()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def create_user(app):
    sequence = count(1)

    def _create_user(**overrides):
        index = next(sequence)
        first_name = overrides.pop("first_name", f"User{index}")
        last_name = overrides.pop("last_name", "Test")

        user = User()
        user.email = overrides.pop("email", f"user{index}@example.com")
        password = overrides.pop("password", "Password123!")
        user.password = pbkdf2_sha256.hash(password)
        user.first_name = first_name
        user.last_name = last_name
        user.initials = overrides.pop("initials", f"{first_name[0]}{last_name[0]}{index}")
        user.phone_number = overrides.pop("phone_number", "1234567890")
        user.occupation = overrides.pop("occupation", "Tester")
        user.role = overrides.pop("role", "student")

        for field_name, field_value in overrides.items():
            setattr(user, field_name, field_value)

        db.session.add(user)
        db.session.commit()
        return user

    return _create_user


@pytest.fixture()
def create_course():
    sequence = count(1)

    def _create_course(**overrides):
        index = next(sequence)
        course = Course()
        course.title = overrides.pop("title", f"Course {index}")
        course.description = overrides.pop("description", "Course description")
        course.price = overrides.pop("price", "99.99")
        course.image_url = overrides.pop("image_url", "/media/defaults/course-default.png")
        course.preview_video_url = overrides.pop("preview_video_url", None)

        for field_name, field_value in overrides.items():
            setattr(course, field_name, field_value)

        db.session.add(course)
        db.session.commit()
        return course

    return _create_course


@pytest.fixture()
def create_enrollment():
    def _create_enrollment(student_id, course_id, **overrides):
        enrollment = Enrollment()
        enrollment.student_id = student_id
        enrollment.course_id = course_id
        enrollment.status = overrides.pop("status", "active")
        enrollment.start_date = overrides.pop(
            "start_date",
            _utcnow_naive(),
        )
        enrollment.end_date = overrides.pop("end_date", None)

        for field_name, field_value in overrides.items():
            setattr(enrollment, field_name, field_value)

        db.session.add(enrollment)
        db.session.commit()
        return enrollment

    return _create_enrollment


@pytest.fixture()
def create_schedule():
    def _create_schedule(enrollment_id, **overrides):
        schedule = Schedule()
        schedule.enrollment_id = enrollment_id
        schedule.date = overrides.pop("date", date.today() + timedelta(days=1))
        schedule.start_time = overrides.pop("start_time", time(9, 0))
        schedule.end_time = overrides.pop("end_time", time(10, 0))
        schedule.zoom_link = overrides.pop("zoom_link", "https://zoom.example/meeting")
        schedule.status = overrides.pop("status", "scheduled")

        for field_name, field_value in overrides.items():
            setattr(schedule, field_name, field_value)

        db.session.add(schedule)
        db.session.commit()
        return schedule

    return _create_schedule


@pytest.fixture()
def auth_headers(app):
    def _auth_headers(user, fresh=False):
        with app.app_context():
            token = create_access_token(
                identity=user.id,
                additional_claims={"role": user.role},
                fresh=fresh,
            )
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


@pytest.fixture()
def refresh_headers(app):
    def _refresh_headers(user):
        with app.app_context():
            token = create_refresh_token(
                identity=user.id,
                additional_claims={"role": user.role},
            )
        return {"Authorization": f"Bearer {token}"}

    return _refresh_headers
