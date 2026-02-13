from db import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Text, unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    profile_image_url = db.Column(db.Text, nullable=True)
    first_name = db.Column(db.Text, nullable=True)
    last_name = db.Column(db.Text, nullable=True)
    account_name = db.Column(db.Text, nullable=True)
    phone_number = db.Column(db.Text, nullable=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    enrolled_courses = db.relationship("Course", back_populates="students", secondary="enrollments")
    enrollments = db.relationship("Enrollment", back_populates="student", lazy="dynamic")
    schedules = db.relationship("Schedule", back_populates="user", cascade="all, delete-orphan", lazy="dynamic")
    reviews = db.relationship("Review", back_populates="user", lazy="dynamic")