from db import db

class EmailNotificationSettings(db.Model):
    __tablename__ = "email_notification_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True, index=True)
    notify_on_new_payment = db.Column(db.Boolean, default=True)
    notify_on_schedule_change = db.Column(db.Boolean, default=True)
    notify_on_new_course = db.Column(db.Boolean, default=True)
    notify_on_meeting_reminder = db.Column(db.Boolean, default=True)

    user = db.relationship("User", back_populates="notification_settings")