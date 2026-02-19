from db import db

class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey("enrollments.id"), nullable=False, index=True)

    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    zoom_link = db.Column(db.Text)
    status = db.Column(db.Enum("scheduled", "reschedule_requested", name="schedule_status"), default="scheduled")
    reminder_sent_at = db.Column(db.DateTime)

    enrollment = db.relationship("Enrollment", back_populates="schedules")
