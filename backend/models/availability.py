from db import db


class Availability(db.Model):
    __tablename__ = "availability"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    day_of_week = db.Column(db.Integer)  # 0-6
    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)

    month_start = db.Column(db.Integer)
    month_end = db.Column(db.Integer)

    specific_date_override = db.Column(db.Date)

    user = db.relationship("User", back_populates="availability")