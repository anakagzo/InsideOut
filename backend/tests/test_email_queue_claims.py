from datetime import datetime, timedelta

from db import db
from models.notification import EmailNotification
from utils import email as email_utils


def test_worker_skips_rows_claimed_by_another_worker(app, monkeypatch):
    sent_to = []

    app.config.update(
        EMAIL_MAX_RETRIES=3,
        EMAIL_BATCH_SIZE=10,
        EMAIL_PROCESSING_CLAIM_TTL_SECONDS=300,
    )

    monkeypatch.setattr(email_utils, "_send_via_sendgrid", lambda to_email, _subject, _body: sent_to.append(to_email))

    with app.app_context():
        already_claimed = EmailNotification()
        already_claimed.to_email = "claimed@example.com"
        already_claimed.subject = "Claimed"
        already_claimed.body = "claimed"
        already_claimed.status = "processing"
        already_claimed.processing_claim_token = "worker-a"
        already_claimed.claimed_at = datetime.utcnow()

        pending = EmailNotification()
        pending.to_email = "pending@example.com"
        pending.subject = "Pending"
        pending.body = "pending"

        db.session.add_all([already_claimed, pending])
        db.session.commit()

        email_utils.process_pending_emails()

        db.session.refresh(already_claimed)
        db.session.refresh(pending)

        assert pending.status == "sent"
        assert already_claimed.status == "processing"
        assert sent_to == ["pending@example.com"]


def test_stale_claim_is_reclaimed_and_processed(app, monkeypatch):
    sent_to = []

    app.config.update(
        EMAIL_MAX_RETRIES=3,
        EMAIL_BATCH_SIZE=10,
        EMAIL_PROCESSING_CLAIM_TTL_SECONDS=60,
    )

    monkeypatch.setattr(email_utils, "_send_via_sendgrid", lambda to_email, _subject, _body: sent_to.append(to_email))

    with app.app_context():
        stale_claimed = EmailNotification()
        stale_claimed.to_email = "stale@example.com"
        stale_claimed.subject = "Stale"
        stale_claimed.body = "stale"
        stale_claimed.status = "processing"
        stale_claimed.processing_claim_token = "worker-old"
        stale_claimed.claimed_at = datetime.utcnow() - timedelta(minutes=10)

        db.session.add(stale_claimed)
        db.session.commit()

        email_utils.process_pending_emails()

        db.session.refresh(stale_claimed)

        assert stale_claimed.status == "sent"
        assert stale_claimed.processing_claim_token is None
        assert stale_claimed.claimed_at is None
        assert sent_to == ["stale@example.com"]