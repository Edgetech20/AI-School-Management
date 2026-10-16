"""add hybrid learning review queue and adaptive metadata

Revision ID: 20260321_0004
Revises: 20260320_0003
Create Date: 2026-03-21 00:20:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260321_0004"
down_revision = "20260320_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    face_columns = {col["name"] for col in inspector.get_columns("face_encodings")}
    face_indexes = {idx["name"] for idx in inspector.get_indexes("face_encodings")}

    if "source" not in face_columns:
        op.add_column("face_encodings", sa.Column("source", sa.String(length=20), nullable=False, server_default="core"))
    if "quality_score" not in face_columns:
        op.add_column("face_encodings", sa.Column("quality_score", sa.Float(), nullable=True))
    if "created_at" not in face_columns:
        op.add_column(
            "face_encodings",
            sa.Column("created_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        )
    if op.f("ix_face_encodings_source") not in face_indexes:
        op.create_index(op.f("ix_face_encodings_source"), "face_encodings", ["source"], unique=False)

    if not inspector.has_table("recognition_reviews"):
        op.create_table(
            "recognition_reviews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=20), nullable=False),
            sa.Column("device_id", sa.String(length=80), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=False),
            sa.Column("margin", sa.Float(), nullable=False),
            sa.Column("embedding", sa.Text(), nullable=False),
            sa.Column("face_image_path", sa.String(length=255), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("review_note", sa.Text(), nullable=False, server_default=""),
            sa.Column("reviewed_by", sa.String(length=80), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=False), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    review_indexes = {idx["name"] for idx in inspector.get_indexes("recognition_reviews")}
    if op.f("ix_recognition_reviews_id") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_id"), "recognition_reviews", ["id"], unique=False)
    if op.f("ix_recognition_reviews_student_id") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_student_id"), "recognition_reviews", ["student_id"], unique=False)
    if op.f("ix_recognition_reviews_event_type") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_event_type"), "recognition_reviews", ["event_type"], unique=False)
    if op.f("ix_recognition_reviews_device_id") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_device_id"), "recognition_reviews", ["device_id"], unique=False)
    if op.f("ix_recognition_reviews_status") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_status"), "recognition_reviews", ["status"], unique=False)
    if op.f("ix_recognition_reviews_expires_at") not in review_indexes:
        op.create_index(op.f("ix_recognition_reviews_expires_at"), "recognition_reviews", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_recognition_reviews_expires_at"), table_name="recognition_reviews")
    op.drop_index(op.f("ix_recognition_reviews_status"), table_name="recognition_reviews")
    op.drop_index(op.f("ix_recognition_reviews_device_id"), table_name="recognition_reviews")
    op.drop_index(op.f("ix_recognition_reviews_event_type"), table_name="recognition_reviews")
    op.drop_index(op.f("ix_recognition_reviews_student_id"), table_name="recognition_reviews")
    op.drop_index(op.f("ix_recognition_reviews_id"), table_name="recognition_reviews")
    op.drop_table("recognition_reviews")

    op.drop_index(op.f("ix_face_encodings_source"), table_name="face_encodings")
    op.drop_column("face_encodings", "created_at")
    op.drop_column("face_encodings", "quality_score")
    op.drop_column("face_encodings", "source")
