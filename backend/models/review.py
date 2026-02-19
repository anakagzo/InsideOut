from datetime import UTC, datetime

from db import db


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True)

    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    tutor_reply = db.Column(db.Text)
    created_at = db.Column(
        db.DateTime,
        default=_utcnow_naive,
    )

    user = db.relationship("User", back_populates="reviews")
    course = db.relationship("Course", back_populates="reviews")

    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_user_course_review"),
    )
