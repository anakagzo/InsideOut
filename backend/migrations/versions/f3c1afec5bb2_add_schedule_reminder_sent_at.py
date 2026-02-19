"""add schedule reminder sent timestamp

Revision ID: f3c1afec5bb2
Revises: 8500808437ea
Create Date: 2026-02-19 16:10:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f3c1afec5bb2"
down_revision = "8500808437ea"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("schedules", schema=None) as batch_op:
        batch_op.add_column(sa.Column("reminder_sent_at", sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table("schedules", schema=None) as batch_op:
        batch_op.drop_column("reminder_sent_at")