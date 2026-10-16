"""make notifications.student_id nullable

Revision ID: 20260323_0006
Revises: 20260323_0005
Create Date: 2026-03-23 14:05:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260323_0006"
down_revision = "20260323_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"]: col for col in inspector.get_columns("notifications")}

    student_col = columns.get("student_id")
    if student_col and not bool(student_col.get("nullable", False)):
        op.alter_column(
            "notifications",
            "student_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"]: col for col in inspector.get_columns("notifications")}

    student_col = columns.get("student_id")
    if student_col and bool(student_col.get("nullable", False)):
        op.alter_column(
            "notifications",
            "student_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
