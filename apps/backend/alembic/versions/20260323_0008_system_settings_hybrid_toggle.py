"""add hybrid learning toggle to system settings

Revision ID: 20260323_0008
Revises: 20260323_0007
Create Date: 2026-03-23 22:05:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260323_0008"
down_revision = "20260323_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("system_settings")} if inspector.has_table("system_settings") else set()

    if "hybrid_learning_enabled" not in columns:
        op.add_column(
            "system_settings",
            sa.Column("hybrid_learning_enabled", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("system_settings")} if inspector.has_table("system_settings") else set()

    if "hybrid_learning_enabled" in columns:
        op.drop_column("system_settings", "hybrid_learning_enabled")
