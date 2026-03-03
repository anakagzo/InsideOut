"""Enrollment endpoints for listing, creating, deleting, and schedule grouping."""

import logging
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.decorators import admin_required, student_required
from models import Enrollment, User, Course, EmailNotification
from models import Schedule
from db import db
from schemas import EnrollmentSchema, GroupedScheduleSchema, EnrollmentListResponseSchema, EnrollmentUpdateSchema
from datetime import datetime, timezone
from collections import defaultdict
from sqlalchemy import or_, case
from flask import request
from utils.zoom import create_zoom_meeting_link, invalidate_zoom_meeting_link
from typing import Any, cast

blp = Blueprint("Enrollments", "enrollments", url_prefix="/enrollments")
logger = logging.getLogger(__name__)


def _get_enrollment_or_404(enrollment_id):
    logger.debug("Resolving enrollment", extra={"enrollment_id": enrollment_id})
    enrollment = db.session.get(Enrollment, enrollment_id)
    if not enrollment:
        abort(404, message="Enrollment not found.")
    return enrollment


def _sync_enrollment_schedule_window(enrollment: Enrollment) -> bool:
    """Sync enrollment start/end dates and auto status from associated schedules."""
    enrollment_schedules = cast(list[Any], enrollment.schedules)
    schedule_dates = [schedule.date for schedule in enrollment_schedules if schedule.date is not None]
    if not schedule_dates:
        return False

    first_date = min(schedule_dates)
    last_date = max(schedule_dates)
    expected_start = datetime.combine(first_date, datetime.min.time())
    expected_end = datetime.combine(last_date, datetime.min.time())

    changed = False
    if enrollment.start_date != expected_start:
        enrollment.start_date = expected_start
        changed = True
    if enrollment.end_date != expected_end:
        enrollment.end_date = expected_end
        changed = True

    today = datetime.now(timezone.utc).date()
    expected_status = "completed" if last_date < today else "active"
    if enrollment.status != "completed" and enrollment.status != expected_status:
        enrollment.status = expected_status
        changed = True

    return changed


def _block_future_meeting_reminders(enrollment: Enrollment) -> int:
    today = datetime.now(timezone.utc).date()
    future_schedules = (
        Schedule.query
        .filter(
            Schedule.enrollment_id == enrollment.id,
            Schedule.date >= today,
            Schedule.status.in_(["scheduled", "reschedule_requested"]),
        )
        .all()
    )
    if not future_schedules:
        return 0

    future_schedule_ids = {schedule.id for schedule in future_schedules}
    for schedule in future_schedules:
        schedule.zoom_link = None

    queued_reminders = (
        EmailNotification.query
        .filter(
            EmailNotification.status.in_(["pending", "processing"]),
            EmailNotification.reference_key.like("meeting-reminder:%"),
        )
        .all()
    )

    blocked_count = 0
    for queued_email in queued_reminders:
        reference_key = queued_email.reference_key or ""
        key_parts = reference_key.split(":")
        if len(key_parts) < 2:
            continue

        try:
            schedule_id = int(key_parts[1])
        except ValueError:
            continue

        if schedule_id not in future_schedule_ids:
            continue

        queued_email.status = "failed"
        queued_email.last_error = "Blocked because enrollment was completed early."
        queued_email.reference_key = None
        queued_email.processing_claim_token = None
        queued_email.claimed_at = None
        blocked_count += 1

    return blocked_count


def _invalidate_enrollment_meeting_links(enrollment: Enrollment) -> tuple[int, int]:
    enrollment_schedules = cast(list[Any], enrollment.schedules)
    schedules_with_links = [
        schedule for schedule in enrollment_schedules if schedule.zoom_link and schedule.zoom_link.strip()
    ]
    if not schedules_with_links:
        return (0, 0)

    unique_links = {str(schedule.zoom_link).strip() for schedule in schedules_with_links}
    invalidated_count = 0
    for link in unique_links:
        if invalidate_zoom_meeting_link(link):
            invalidated_count += 1

    for schedule in schedules_with_links:
        schedule.zoom_link = None

    return (len(unique_links), invalidated_count)


def _refresh_upcoming_enrollment_meeting_links(enrollment: Enrollment) -> int:
    today = datetime.now(timezone.utc).date()
    enrollment_schedules = cast(list[Any], enrollment.schedules)
    upcoming_schedules = [
        schedule
        for schedule in enrollment_schedules
        if schedule.date is not None and schedule.date >= today and schedule.status in ("scheduled", "reschedule_requested")
    ]
    if not upcoming_schedules:
        return 0

    topic = f"{enrollment.course.title} - Enrollment {enrollment.id}"
    try:
        new_zoom_link = create_zoom_meeting_link(topic=topic)
    except RuntimeError:
        logger.exception("Zoom meeting creation failed during enrollment reactivation", extra={"enrollment_id": enrollment.id})
        abort(502, message="Unable to create a new meeting link for reactivated enrollment.")

    for schedule in upcoming_schedules:
        schedule.zoom_link = new_zoom_link

    return len(upcoming_schedules)


@blp.route("/")
class EnrollmentList(MethodView):
    """Collection operations for enrollments."""

    @jwt_required()
    @blp.response(200, EnrollmentListResponseSchema)
    def get(self):
        """Return paginated enrollments; students see their own, admins see all."""
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        if not user:
            abort(404, message="User not found.")

        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 10, type=int)
        search = request.args.get("search", "").strip()
        logger.info(
            "Enrollment list requested",
            extra={
                "page": page,
                "page_size": page_size,
                "has_search": bool(search),
                "user_id": user_id,
                "user_role": user.role,
            },
        )

        normalized_search = " ".join(search.split())
        
        query = Enrollment.query

        if user.role != "admin":
            query = query.filter(Enrollment.student_id == user_id)
        
        if search:
            # Join to both Course and User tables
            query = query.join(Course).join(User)
            
            # Filter by search term across multiple fields
            full_name = User.first_name + " " + User.last_name
            query = query.filter(
                or_(
                    Course.title.ilike(f"%{search}%"),
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%"),
                    full_name.ilike(f"%{normalized_search}%")
                )
            )
            
            # Order by relevance (exact matches first, then starts with, then partial)
            relevance = case(
                (Course.title == search, 4),  # Exact course title match
                (Course.title.ilike(f"{search}%"), 3),  # Course title starts with
                (or_(User.first_name == search, User.last_name == search, full_name == normalized_search), 2),  # Exact name match
                (or_(User.first_name.ilike(f"{search}%"), User.last_name.ilike(f"{search}%"), full_name.ilike(f"{normalized_search}%")), 1),  # Name starts with
                else_=0
            )
            query = query.order_by(relevance.desc())
        
        pagination = query.paginate(
            page=page,
            per_page=page_size,
            error_out=False
        )

        sync_changed = False
        for enrollment in pagination.items:
            if _sync_enrollment_schedule_window(enrollment):
                sync_changed = True
        if sync_changed:
            db.session.commit()

        return {
            "data": pagination.items,
            "pagination": {
                "page": pagination.page,
                "page_size": pagination.per_page,
                "total": pagination.total,
                "total_pages": pagination.pages
            }
        }

    @jwt_required()
    @student_required
    @blp.arguments(EnrollmentSchema)
    @blp.response(201, EnrollmentSchema)
    def post(self, data):
        """Create an enrollment for the authenticated student."""
        user_id = get_jwt_identity()
        logger.info("Enrollment create requested", extra={"user_id": user_id})
    
        # Verify student_id matches the authenticated user to prevent enrolling other users
        if data.get("student_id") != user_id:
            abort(403, message="Cannot enroll another user.")

        enrollment = Enrollment(**data)
        db.session.add(enrollment)
        db.session.commit()
        logger.info("Enrollment created", extra={"enrollment_id": enrollment.id, "user_id": user_id})
        return enrollment
    

@blp.route("/<int:enrollment_id>")
class EnrollmentDetail(MethodView):
    """Operations for a single enrollment."""

    @jwt_required()
    @blp.response(200, EnrollmentSchema)
    def get(self, enrollment_id):
        """Get enrollment details if the caller owns the enrollment."""
        user_id = get_jwt_identity()
        logger.info("Enrollment detail requested", extra={"enrollment_id": enrollment_id, "user_id": user_id})
        enrollment = _get_enrollment_or_404(enrollment_id)
        if enrollment.student_id != user_id:
            abort(403, message="Access denied.")

        if _sync_enrollment_schedule_window(enrollment):
            db.session.commit()
        return enrollment

    @jwt_required()
    @admin_required
    @blp.arguments(EnrollmentUpdateSchema)
    @blp.response(200, EnrollmentSchema)
    def put(self, data, enrollment_id):
        """Update enrollment status as admin; dates remain auto-derived from schedules."""
        enrollment = _get_enrollment_or_404(enrollment_id)
        _sync_enrollment_schedule_window(enrollment)

        target_status = data["status"]
        force_complete = bool(data.get("force_complete", False))
        provider_invalidation_targets = 0
        provider_invalidation_succeeded = 0
        links_refreshed_count = 0
        blocked_reminders_count = 0

        if target_status == "completed":
            now = datetime.now(timezone.utc)
            has_future_unattended = (
                Schedule.query
                .filter(
                    Schedule.enrollment_id == enrollment.id,
                    Schedule.status.in_(["scheduled", "reschedule_requested"]),
                    Schedule.date >= now.date(),
                )
                .first()
                is not None
            )
            if has_future_unattended and not force_complete:
                abort(
                    409,
                    message=(
                        "This enrollment has upcoming classes. Marking as completed now will stop future notifications "
                        "and the meeting link should no longer be used. Save again to confirm."
                    ),
                )

            enrollment.status = "completed"
            provider_invalidation_targets, provider_invalidation_succeeded = _invalidate_enrollment_meeting_links(enrollment)
            if provider_invalidation_targets:
                logger.info(
                    "Enrollment meeting links invalidated",
                    extra={
                        "enrollment_id": enrollment.id,
                        "provider_targets": provider_invalidation_targets,
                        "provider_invalidated": provider_invalidation_succeeded,
                    },
                )
            if force_complete:
                blocked_reminders_count = _block_future_meeting_reminders(enrollment)
                if blocked_reminders_count:
                    logger.info(
                        "Blocked queued meeting reminders after forced completion",
                        extra={"enrollment_id": enrollment.id, "blocked_count": blocked_reminders_count},
                    )
        else:
            enrollment.status = "active"
            links_refreshed_count = _refresh_upcoming_enrollment_meeting_links(enrollment)
            if links_refreshed_count:
                logger.info(
                    "Enrollment meeting links refreshed on reactivation",
                    extra={"enrollment_id": enrollment.id, "schedule_count": links_refreshed_count},
                )

        setattr(enrollment, "provider_invalidation_targets", provider_invalidation_targets)
        setattr(enrollment, "provider_invalidation_succeeded", provider_invalidation_succeeded)
        setattr(enrollment, "links_refreshed_count", links_refreshed_count)
        setattr(enrollment, "blocked_reminders_count", blocked_reminders_count)

        db.session.commit()
        return enrollment
    
    @jwt_required(fresh=True)
    @admin_required 
    def delete(self, enrollment_id):
        """Delete an enrollment as an admin."""
        logger.info("Enrollment delete requested", extra={"enrollment_id": enrollment_id})
        enrollment = _get_enrollment_or_404(enrollment_id)
        
        db.session.delete(enrollment)
        db.session.commit()
        logger.info("Enrollment deleted", extra={"enrollment_id": enrollment_id})
        return {"message": "Enrollment deleted successfully."}, 200
    
@blp.route("/schedules")
class EnrollmentSchedules(MethodView):
    """Read schedules grouped by date across enrollments."""

    @jwt_required()
    @blp.response(200, GroupedScheduleSchema(many=True))
    def get(self):
        """Return schedule items grouped by date for the caller or all users (admin)."""
        user_id = get_jwt_identity()
        logger.info("Enrollment schedules requested", extra={"user_id": user_id})
        user = db.session.get(User, user_id)
        if not user:
            abort(404, message="User not found.")
        
        enrollments = Enrollment.query
        if user.role != "admin":  # Only filter by student_id for non-admin users
            enrollments = enrollments.filter_by(student_id=user_id).all()
        else:
            enrollments = enrollments.all()

        # Group schedules by date
        schedules_by_date = defaultdict(list)
        
        for enrollment in enrollments:
            for schedule in enrollment.schedules:
                date_key = schedule.date.isoformat()  # Use ISO format for date key
                schedules_by_date[date_key].append({
                    "id": schedule.id,
                    "date": schedule.date,
                    "start_time": schedule.start_time,
                    "end_time": schedule.end_time,
                    "zoom_link": schedule.zoom_link,
                    "status": schedule.status
                })
        
        # Convert to list of dicts with 'date' and 'schedules' keys
        result = [
            {
                "date": datetime.strptime(date, "%Y-%m-%d").date(),
                "schedules": schedules
            }
            for date, schedules in sorted(schedules_by_date.items())
        ]
        
        return result    