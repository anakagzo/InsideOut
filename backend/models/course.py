from db import db
from datetime import datetime

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text)
    preview_video_url = db.Column(db.Text)
    price = db.Column(db.Numeric(10,2), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship("Review", back_populates="course", cascade="all, delete-orphan")
    enrollments = db.relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")









