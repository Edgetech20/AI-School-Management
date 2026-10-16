"""add class assignment to admin_users

Revision ID: 20260320_0002
Revises: 20260319_0001
Create Date: 2026-03-20 00:00:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260320_0002"
down_revision = "20260319_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("admin_users", sa.Column("class_name", sa.String(length=60), nullable=True))
    op.create_index(op.f("ix_admin_users_class_name"), "admin_users", ["class_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_admin_users_class_name"), table_name="admin_users")
    op.drop_column("admin_users", "class_name")
