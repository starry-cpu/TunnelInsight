"""add tunnel coordinates

Revision ID: 008
Revises: 007
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tunnels', sa.Column('longitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('tunnels', sa.Column('latitude', sa.Numeric(10, 7), nullable=True))


def downgrade():
    op.drop_column('tunnels', 'latitude')
    op.drop_column('tunnels', 'longitude')
