from datetime import datetime, timezone
from db import db

class Enrollment(db.Model):
    __tablename__ = "enrollments"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True)

    status = db.Column(
        db.Enum("active", "completed", "cancelled", name="enrollment_status"),
        default="active"
    )

    start_date = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    end_date = db.Column(db.DateTime)

    student = db.relationship("User", back_populates="enrollments")
    course = db.relationship("Course", back_populates="enrollments")
    schedules = db.relationship("Schedule", back_populates="enrollment", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("student_id", "course_id", name="uq_student_course"),
    )

