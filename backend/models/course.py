from db import db

class Course(db.Model): 
    __tablename__ = "courses"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, unique=True, nullable=False)
    image_url = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), unique=False, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    reviews = db.relationship("Review", back_populates="course", cascade="all, delete-orphan", lazy="dynamic"  )
    students = db.relationship("User", back_populates="enrolled_courses", secondary="enrollments", lazy="dynamic")
    enrollments = db.relationship("Enrollment", back_populates="course", lazy="dynamic")









