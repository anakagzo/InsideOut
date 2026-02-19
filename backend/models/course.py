from datetime import UTC, datetime
from typing import Any, cast

from db import db
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import func, select


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text)
    preview_video_url = db.Column(db.Text)
    price = db.Column(db.Numeric(10,2), nullable=False)

    created_at = db.Column(
        db.DateTime,
        default=_utcnow_naive,
    )

    reviews = db.relationship("Review", back_populates="course", cascade="all, delete-orphan")
    enrollments = db.relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")

    @hybrid_property
    def average_rating(self):
        reviews = cast(list[Any], self.reviews)
        if not reviews:
            return 0.0
        return sum(r.rating for r in reviews) / len(reviews)

    @average_rating.expression
    def average_rating_expression(cls):
        from .review import Review

        return (
            select(func.coalesce(func.avg(Review.rating), 0.0))
            .where(Review.course_id == cls.id)
            .scalar_subquery()
        )

class SavedCourse(db.Model):
    __tablename__ = "saved_courses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="unique_saved_course"),
    )










