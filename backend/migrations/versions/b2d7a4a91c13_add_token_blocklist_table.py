"""add token blocklist table

Revision ID: b2d7a4a91c13
Revises: a9e2d58c41b7
Create Date: 2026-02-23 10:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2d7a4a91c13"
down_revision = "a9e2d58c41b7"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "token_blocklist",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("jti", sa.String(length=36), nullable=False),
        sa.Column("token_type", sa.String(length=20), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("token_blocklist", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_token_blocklist_created_at"), ["created_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_token_blocklist_expires_at"), ["expires_at"], unique=False)
        batch_op.create_index(batch_op.f("ix_token_blocklist_jti"), ["jti"], unique=True)
        batch_op.create_index(batch_op.f("ix_token_blocklist_user_id"), ["user_id"], unique=False)


def downgrade():
    with op.batch_alter_table("token_blocklist", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_token_blocklist_user_id"))
        batch_op.drop_index(batch_op.f("ix_token_blocklist_jti"))
        batch_op.drop_index(batch_op.f("ix_token_blocklist_expires_at"))
        batch_op.drop_index(batch_op.f("ix_token_blocklist_created_at"))

    op.drop_table("token_blocklist")
