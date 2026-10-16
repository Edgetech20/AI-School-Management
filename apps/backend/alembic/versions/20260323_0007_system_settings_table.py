"""add system settings table for smtp and sms setup

Revision ID: 20260323_0007
Revises: 20260323_0006
Create Date: 2026-03-23 17:20:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260323_0007"
down_revision = "20260323_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("system_settings"):
        op.create_table(
            "system_settings",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("smtp_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("smtp_host", sa.String(length=191), nullable=True),
            sa.Column("smtp_port", sa.Integer(), nullable=False, server_default="587"),
            sa.Column("smtp_username", sa.String(length=191), nullable=True),
            sa.Column("smtp_password", sa.String(length=255), nullable=True),
            sa.Column("smtp_encryption", sa.String(length=20), nullable=False, server_default="tls"),
            sa.Column("smtp_from_email", sa.String(length=191), nullable=True),
            sa.Column("smtp_from_name", sa.String(length=191), nullable=True),
            sa.Column("sms_provider", sa.String(length=20), nullable=False, server_default="console"),
            sa.Column("sms_webhook_url", sa.String(length=255), nullable=True),
            sa.Column("parent_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("system_settings"):
        op.drop_table("system_settings")
