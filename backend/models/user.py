from db import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    initials = db.Column(db.String(10), unique=True, nullable=False)

    phone_number = db.Column(db.String(20))
    occupation = db.Column(db.String(120))

    role = db.Column(db.Enum("student", "admin", name="user_roles"), default="student")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    enrollments = db.relationship("Enrollment", back_populates="student", cascade="all, delete")
    reviews = db.relationship("Review", back_populates="user", cascade="all, delete")
    notification_settings = db.relationship("EmailNotificationSettings", uselist=False, back_populates="user")
    availability = db.relationship("Availability", back_populates="user", cascade="all, delete")
    unavailable_dates = db.relationship("AvailabilityUnavailableDate", back_populates="user", cascade="all, delete")
