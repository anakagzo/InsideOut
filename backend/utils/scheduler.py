"""Scheduler utility helpers.

This module wires background recurring jobs for:
- processing queued emails through SendGrid
- enqueuing meeting reminders based on user preferences

Jobs execute inside Flask app context so they can use config, DB session, and
application logging safely.
"""

import atexit
import os

from apscheduler.schedulers.background import BackgroundScheduler

from utils.email import process_pending_emails
from utils.notifications import process_meeting_reminders

scheduler = BackgroundScheduler()


def init_scheduler(app):
    """Initialize APScheduler jobs once per app process.

    Guard rails are included for:
    - pytest runs
    - explicit config disable
    - Flask debug reloader parent process
    """
    if "PYTEST_CURRENT_TEST" in os.environ:
        app.logger.info("Email scheduler disabled under pytest")
        return

    if not app.config.get("EMAIL_SCHEDULER_ENABLED", True):
        app.logger.info("Email scheduler disabled by configuration")
        return

    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        app.logger.info("Skipping scheduler in Werkzeug reloader parent process")
        return

    def _email_retry_job():
        with app.app_context():
            process_pending_emails()

    def _meeting_reminder_job():
        with app.app_context():
            process_meeting_reminders()

    scheduler.add_job(
        func=_email_retry_job,
        trigger="interval",
        seconds=app.config["EMAIL_RETRY_INTERVAL_SECONDS"],
        id="email_retry_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.add_job(
        func=_meeting_reminder_job,
        trigger="interval",
        seconds=app.config["MEETING_REMINDER_CHECK_INTERVAL_SECONDS"],
        id="meeting_reminder_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    if not scheduler.running:
        scheduler.start()

    # Shut down scheduler when app exits
    atexit.register(_shutdown_scheduler)


def _shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
