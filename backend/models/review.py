from db import db

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)

    user = db.relationship("User", back_populates="reviews")
    course = db.relationship("Course", back_populates="reviews")

    __table_args__ = (
        db.UniqueConstraint("user_id", "course_id", name="uq_user_course_review"),
    )
