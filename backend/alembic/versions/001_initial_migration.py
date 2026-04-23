"""Initial migration for TunnelInsight database

Revision ID: 001
Revises:
Create Date: 2026-02-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(100), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('locale', sa.String(10), nullable=True, server_default='zh-CN'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('1')),
        sa.Column('is_verified', sa.Boolean(), nullable=True, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_username', 'users', ['username'])

    # Create tunnels table
    op.create_table(
        'tunnels',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('length_km', sa.Numeric(10, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'name', name='uq_tunnels_user_name'),
    )
    op.create_index('idx_tunnels_user_id', 'tunnels', ['user_id'])

    # Create locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tunnel_id', sa.String(36), nullable=False),
        sa.Column('stake_mark', sa.String(50), nullable=False),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('position_description', sa.String(500), nullable=True),
        sa.Column('longitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 7), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['tunnel_id'], ['tunnels.id'], ondelete='CASCADE'),
        sa.CheckConstraint("direction IN ('left', 'right', 'top', 'bottom')", name='check_direction'),
        sa.UniqueConstraint('tunnel_id', 'stake_mark', 'direction', name='uq_locations_tunnel_stake_direction'),
    )
    op.create_index('idx_locations_tunnel_id', 'locations', ['tunnel_id'])

    # Create defect_records table
    op.create_table(
        'defect_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('tunnel_id', sa.String(36), nullable=True),
        sa.Column('location_id', sa.String(36), nullable=True),
        sa.Column('image_path', sa.Text(), nullable=False),
        sa.Column('final_result', sa.Text(), nullable=False),
        sa.Column('raw_response', sa.Text(), nullable=True),
        sa.Column('model_used', sa.String(100), nullable=True, server_default='qwen2.5-vl-7b-instruct'),
        sa.Column('inference_time_ms', sa.Integer(), nullable=True),
        sa.Column('settings_json', sa.JSON(), nullable=True),
        sa.Column('defect_type', sa.String(100), nullable=True),
        sa.Column('severity', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tunnel_id'], ['tunnels.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='SET NULL'),
        sa.CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", name='check_severity'),
    )
    op.create_index('idx_defect_records_user_id', 'defect_records', ['user_id'])
    op.create_index('idx_defect_records_created_at', 'defect_records', [sa.text('created_at DESC')])
    op.create_index('idx_defect_records_tunnel_id', 'defect_records', ['tunnel_id'])
    op.create_index('idx_defect_records_location_id', 'defect_records', ['location_id'])


def downgrade() -> None:
    op.drop_table('defect_records')
    op.drop_table('locations')
    op.drop_table('tunnels')
    op.drop_table('users')
