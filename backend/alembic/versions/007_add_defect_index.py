"""add defect deduplication index

Revision ID: 007
Revises: 006
Create Date: 2026-03-16

"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the old index (subset of the new one)
    op.drop_index('ix_defect_records_location', table_name='defect_records')

    # Add new index with created_at DESC for deduplication query optimization
    # This optimizes the "get latest defect per location" query
    op.create_index(
        'ix_defect_records_tunnel_location_time',
        'defect_records',
        ['tunnel_id', 'stake_mark', 'direction', text('created_at DESC')],
        unique=False
    )


def downgrade():
    op.drop_index('ix_defect_records_tunnel_location_time', table_name='defect_records')
    # Restore the old index
    op.create_index(
        'ix_defect_records_location',
        'defect_records',
        ['tunnel_id', 'stake_mark', 'direction']
    )
