"""add classes table

Revision ID: 20260320_0003
Revises: 20260320_0002
Create Date: 2026-03-20 00:10:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260320_0003"
down_revision = "20260320_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "classes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_classes_id"), "classes", ["id"], unique=False)
    op.create_index(op.f("ix_classes_name"), "classes", ["name"], unique=False)

    op.execute(
        """
        INSERT IGNORE INTO classes (name, created_at)
        SELECT DISTINCT s.class, NOW()
        FROM students s
        WHERE s.class IS NOT NULL AND TRIM(s.class) <> ''
        """
    )
    op.execute(
        """
        INSERT IGNORE INTO classes (name, created_at)
        SELECT DISTINCT u.class_name, NOW()
        FROM admin_users u
        WHERE u.class_name IS NOT NULL AND TRIM(u.class_name) <> ''
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_classes_name"), table_name="classes")
    op.drop_index(op.f("ix_classes_id"), table_name="classes")
    op.drop_table("classes")
