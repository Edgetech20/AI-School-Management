"""initial schema

Revision ID: 20260319_0001
Revises: 
Create Date: 2026-03-19 00:00:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260319_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_admin_users_id"), "admin_users", ["id"], unique=False)
    op.create_index(op.f("ix_admin_users_username"), "admin_users", ["username"], unique=False)

    op.create_table(
        "rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("school_start_time", sa.String(length=5), nullable=False),
        sa.Column("late_threshold_time", sa.String(length=5), nullable=False),
        sa.Column("minimum_hours", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("class", sa.String(length=60), nullable=False),
        sa.Column("roll_number", sa.String(length=40), nullable=False),
        sa.Column("parent_phone", sa.String(length=30), nullable=False),
        sa.Column("parent_email", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("roll_number"),
    )
    op.create_index(op.f("ix_students_id"), "students", ["id"], unique=False)
    op.create_index(op.f("ix_students_name"), "students", ["name"], unique=False)
    op.create_index(op.f("ix_students_class"), "students", ["class"], unique=False)

    op.create_table(
        "face_encodings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("encoding", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_face_encodings_id"), "face_encodings", ["id"], unique=False)

    op.create_table(
        "attendance_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("check_in_time", sa.DateTime(timezone=False), nullable=True),
        sa.Column("check_out_time", sa.DateTime(timezone=False), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "date", name="uq_student_date"),
    )
    op.create_index(op.f("ix_attendance_logs_id"), "attendance_logs", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_logs_student_id"), "attendance_logs", ["student_id"], unique=False)
    op.create_index(op.f("ix_attendance_logs_date"), "attendance_logs", ["date"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=False), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_student_id"), "notifications", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_student_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")

    op.drop_index(op.f("ix_attendance_logs_date"), table_name="attendance_logs")
    op.drop_index(op.f("ix_attendance_logs_student_id"), table_name="attendance_logs")
    op.drop_index(op.f("ix_attendance_logs_id"), table_name="attendance_logs")
    op.drop_table("attendance_logs")

    op.drop_index(op.f("ix_face_encodings_id"), table_name="face_encodings")
    op.drop_table("face_encodings")

    op.drop_index(op.f("ix_students_class"), table_name="students")
    op.drop_index(op.f("ix_students_name"), table_name="students")
    op.drop_index(op.f("ix_students_id"), table_name="students")
    op.drop_table("students")

    op.drop_table("rules")

    op.drop_index(op.f("ix_admin_users_username"), table_name="admin_users")
    op.drop_index(op.f("ix_admin_users_id"), table_name="admin_users")
    op.drop_table("admin_users")
