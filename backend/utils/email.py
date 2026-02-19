"""Email utility helpers."""
import logging
from datetime import datetime
from datetime import timedelta
from datetime import UTC
from uuid import uuid4

from flask import current_app
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from db import db
from models.notification import EmailNotification

logger = logging.getLogger(__name__)


def _utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def queue_email(to_email: str, subject: str, body: str, reference_key: str | None = None):
    """
    Add email to queue instead of sending immediately.
    """
    email = EmailNotification()
    email.to_email = to_email
    email.subject = subject
    email.body = body
    email.reference_key = reference_key

    if reference_key:
        existing = EmailNotification.query.filter_by(reference_key=reference_key).first()
        if existing:
            return existing

    try:
        db.session.add(email)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        if reference_key:
            return EmailNotification.query.filter_by(reference_key=reference_key).first()
        raise
    except Exception:
        db.session.rollback()
        logger.exception("Failed to queue email", extra={"to_email": to_email, "subject": subject})
        raise

    return email


def _send_via_sendgrid(to_email: str, subject: str, body: str):
    api_key = current_app.config.get("SENDGRID_API_KEY")
    email_from = current_app.config.get("EMAIL_FROM")
    if not api_key or not email_from:
        raise RuntimeError("Missing SendGrid configuration: SENDGRID_API_KEY and EMAIL_FROM are required")

    message = Mail(
        from_email=email_from,
        to_emails=to_email,
        subject=subject,
        html_content=body,
    )

    sg = SendGridAPIClient(api_key)
    sg.send(message)


def process_pending_emails():
    """
    Background job that:
    - Fetches pending emails
    - Attempts to send
    - Retries on failure
    """
    max_retries = current_app.config["EMAIL_MAX_RETRIES"]
    batch_size = current_app.config["EMAIL_BATCH_SIZE"]
    claim_ttl_seconds = current_app.config["EMAIL_PROCESSING_CLAIM_TTL_SECONDS"]
    now = _utcnow_naive()

    stale_threshold = now - timedelta(seconds=claim_ttl_seconds)
    reclaimed_count = EmailNotification.query.filter(
        EmailNotification.status == "processing",
        EmailNotification.claimed_at.isnot(None),
        EmailNotification.claimed_at < stale_threshold,
        EmailNotification.retry_count < max_retries,
    ).update(
        {
            EmailNotification.status: "pending",
            EmailNotification.processing_claim_token: None,
            EmailNotification.claimed_at: None,
            EmailNotification.last_error: "Claim expired before processing completed.",
        },
        synchronize_session=False,
    )

    if reclaimed_count:
        db.session.commit()
        logger.warning("Reclaimed stale email processing claims", extra={"count": reclaimed_count})

    claim_token = uuid4().hex
    candidate_ids = select(EmailNotification.id).where(
        EmailNotification.status == "pending",
        EmailNotification.retry_count < max_retries,
    ).order_by(EmailNotification.created_at.asc()).limit(batch_size)

    claimed_count = EmailNotification.query.filter(
        EmailNotification.id.in_(candidate_ids),
        EmailNotification.status == "pending",
    ).update(
        {
            EmailNotification.status: "processing",
            EmailNotification.processing_claim_token: claim_token,
            EmailNotification.claimed_at: now,
        },
        synchronize_session=False,
    )
    db.session.commit()

    if not claimed_count:
        return

    pending_emails = EmailNotification.query.filter(
        EmailNotification.status == "processing",
        EmailNotification.processing_claim_token == claim_token,
    ).order_by(EmailNotification.created_at.asc()).all()

    logger.info("Processing pending emails", extra={"count": len(pending_emails)})

    for email in pending_emails:
        try:
            _send_via_sendgrid(email.to_email, email.subject, email.body)

            email.status = "sent"
            email.sent_at = _utcnow_naive()
            email.last_error = None
            email.processing_claim_token = None
            email.claimed_at = None

        except Exception as e:
            email.retry_count += 1
            email.last_error = str(e)
            email.processing_claim_token = None
            email.claimed_at = None
            logger.exception(
                "Failed to send queued email",
                extra={"email_id": email.id, "retry_count": email.retry_count},
            )

            if email.retry_count >= max_retries:
                email.status = "failed"
            else:
                email.status = "pending"

        finally:
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
                logger.exception("Failed to persist queued email status", extra={"email_id": email.id})
