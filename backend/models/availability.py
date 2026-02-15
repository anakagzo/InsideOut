from db import db
from datetime import datetime


class Availability(db.Model):
    __tablename__ = "availability"

    __table_args__ = (
        db.UniqueConstraint("user_id", "day_of_week", name="uq_availability_user_day"),
        db.CheckConstraint("month_start >= 1 AND month_start <= 12", name="ck_availability_month_start_range"),
        db.CheckConstraint("month_end >= 1 AND month_end <= 12", name="ck_availability_month_end_range"),
        db.CheckConstraint("month_start <= month_end", name="ck_availability_month_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    day_of_week = db.Column(db.Integer, nullable=False)  # 1-7: Monday-Sunday
    month_start = db.Column(db.Integer, nullable=False, default=lambda: datetime.utcnow().month)
    month_end = db.Column(db.Integer, nullable=False, default=lambda: datetime.utcnow().month)

    user = db.relationship("User", back_populates="availability")
    time_slots = db.relationship(
        "AvailabilityTimeSlot",
        back_populates="availability",
        cascade="all, delete-orphan",
        order_by="AvailabilityTimeSlot.start_time",
    )


class AvailabilityTimeSlot(db.Model):
    __tablename__ = "availability_time_slots"

    __table_args__ = (
        db.CheckConstraint("start_time < end_time", name="ck_availability_slot_time_order"),
    )

    id = db.Column(db.Integer, primary_key=True)
    availability_id = db.Column(db.Integer, db.ForeignKey("availability.id"), nullable=False)

    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    availability = db.relationship("Availability", back_populates="time_slots")


class AvailabilityUnavailableDate(db.Model):
    __tablename__ = "availability_unavailable_dates"

    __table_args__ = (
        db.UniqueConstraint("user_id", "unavailable_date", name="uq_unavailable_user_date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    unavailable_date = db.Column(db.Date, nullable=False)

    user = db.relationship("User", back_populates="unavailable_dates")