"""add stake_mark, direction and evolution_analyses table

Revision ID: 006
Revises: 005_add_rag_fields
Create Date: 2026-03-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    # 1. 添加桩号和方向到 defect_records
    op.add_column('defect_records', sa.Column('stake_mark', sa.String(50), nullable=True))
    op.add_column('defect_records', sa.Column('direction', sa.String(20), nullable=True))

    # 2. 添加复合索引
    op.create_index('ix_defect_records_location', 'defect_records',
                    ['tunnel_id', 'stake_mark', 'direction'])

    # 3. 创建演变分析表
    op.create_table(
        'evolution_analyses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tunnel_id', sa.String(36), sa.ForeignKey('tunnels.id', ondelete='SET NULL')),
        sa.Column('stake_mark', sa.String(50), nullable=False),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('records_count', sa.Integer, nullable=False),
        sa.Column('analyzed_record_ids', sa.JSON, nullable=False),
        sa.Column('deterioration_rate', sa.Numeric(3, 1), nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),
        sa.Column('urgency_score', sa.Numeric(3, 1), nullable=False),
        sa.Column('timeline_summary', sa.Text()),
        sa.Column('trend', sa.String(20)),
        sa.Column('cause_analysis', sa.Text()),
        sa.Column('repair_priority', sa.Text()),
        sa.Column('future_prediction', sa.Text()),
        sa.Column('model_used', sa.String(100)),
        sa.Column('inference_time_ms', sa.Integer()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table('evolution_analyses')
    op.drop_index('ix_defect_records_location', table_name='defect_records')
    op.drop_column('defect_records', 'direction')
    op.drop_column('defect_records', 'stake_mark')
