"""add_last_match_confidence_to_attendance_logs

Revision ID: 6370aaedce28
Revises: ccc5db512ddd
Create Date: 2026-03-23 17:34:31.896814

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6370aaedce28'
down_revision = 'ccc5db512ddd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('attendance_logs', sa.Column('last_match_confidence', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('attendance_logs', 'last_match_confidence')
