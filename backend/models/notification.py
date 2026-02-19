from db import db
from datetime import datetime

class EmailNotificationSettings(db.Model):
    __tablename__ = "email_notification_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    notify_on_new_payment = db.Column(db.Boolean, default=True)
    notify_on_schedule_change = db.Column(db.Boolean, default=True)
    notify_on_new_course = db.Column(db.Boolean, default=True)
    notify_on_meeting_reminder = db.Column(db.Boolean, default=True)
    meeting_reminder_lead_minutes = db.Column(db.Integer, default=60)

    user = db.relationship("User", back_populates="notification_settings")


class EmailNotification(db.Model):
    __tablename__ = "email_notifications"

    id = db.Column(db.Integer, primary_key=True)
    to_email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    reference_key = db.Column(db.String(120), unique=True, index=True)

    status = db.Column(db.String(50), default="pending")  # pending, processing, sent, failed
    retry_count = db.Column(db.Integer, default=0)
    last_error = db.Column(db.Text)
    processing_claim_token = db.Column(db.String(64), index=True)
    claimed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime)
