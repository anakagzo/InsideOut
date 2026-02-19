"""add notification lead and email reference key

Revision ID: a9e2d58c41b7
Revises: f3c1afec5bb2
Create Date: 2026-02-19 17:05:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a9e2d58c41b7"
down_revision = "f3c1afec5bb2"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("email_notification_settings", schema=None) as batch_op:
        batch_op.add_column(sa.Column("meeting_reminder_lead_minutes", sa.Integer(), nullable=True))

    with op.batch_alter_table("email_notifications", schema=None) as batch_op:
        batch_op.add_column(sa.Column("reference_key", sa.String(length=120), nullable=True))
        batch_op.create_index(batch_op.f("ix_email_notifications_reference_key"), ["reference_key"], unique=True)


def downgrade():
    with op.batch_alter_table("email_notifications", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_email_notifications_reference_key"))
        batch_op.drop_column("reference_key")

    with op.batch_alter_table("email_notification_settings", schema=None) as batch_op:
        batch_op.drop_column("meeting_reminder_lead_minutes")