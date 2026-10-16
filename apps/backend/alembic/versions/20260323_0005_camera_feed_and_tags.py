"""add camera feed connection fields and usage tags

Revision ID: 20260323_0005
Revises: 20260321_0004
Create Date: 2026-03-23 00:10:00

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260323_0005"
down_revision = "20260321_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {col["name"] for col in inspector.get_columns("camera_devices")}
    indexes = {idx["name"] for idx in inspector.get_indexes("camera_devices")}

    if "ip_address" not in columns:
        op.add_column("camera_devices", sa.Column("ip_address", sa.String(length=64), nullable=True))
    if "port" not in columns:
        op.add_column("camera_devices", sa.Column("port", sa.Integer(), nullable=True))
    if "stream_url" not in columns:
        op.add_column("camera_devices", sa.Column("stream_url", sa.String(length=255), nullable=True))
    if "stream_username" not in columns:
        op.add_column("camera_devices", sa.Column("stream_username", sa.String(length=120), nullable=True))
    if "stream_password" not in columns:
        op.add_column("camera_devices", sa.Column("stream_password", sa.String(length=255), nullable=True))
    if "usage_tag" not in columns:
        op.add_column("camera_devices", sa.Column("usage_tag", sa.String(length=20), nullable=False, server_default="both"))

    if op.f("ix_camera_devices_usage_tag") not in indexes:
        op.create_index(op.f("ix_camera_devices_usage_tag"), "camera_devices", ["usage_tag"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("camera_devices")}
    indexes = {idx["name"] for idx in inspector.get_indexes("camera_devices")}

    if op.f("ix_camera_devices_usage_tag") in indexes:
        op.drop_index(op.f("ix_camera_devices_usage_tag"), table_name="camera_devices")

    if "usage_tag" in columns:
        op.drop_column("camera_devices", "usage_tag")
    if "stream_password" in columns:
        op.drop_column("camera_devices", "stream_password")
    if "stream_username" in columns:
        op.drop_column("camera_devices", "stream_username")
    if "stream_url" in columns:
        op.drop_column("camera_devices", "stream_url")
    if "port" in columns:
        op.drop_column("camera_devices", "port")
    if "ip_address" in columns:
        op.drop_column("camera_devices", "ip_address")
