from db import db

class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    enrollment_id = db.Column(db.Integer, db.ForeignKey("enrollments.id"), nullable=False, index=True)
    scheduled_date = db.Column(db.DateTime, nullable=False)

    enrollment = db.relationship("Enrollment", back_populates="schedules")
    user = db.relationship("User", back_populates="schedules")