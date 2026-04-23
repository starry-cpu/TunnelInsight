"""add rag fields to defect records

Revision ID: 005
Revises: 004_add_config_levels
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade():
    # Add RAG-related fields to defect_records table
    op.add_column('defect_records', sa.Column('repair_suggestion', sa.Text(), nullable=True))
    op.add_column('defect_records', sa.Column('suggestion_sources', sa.JSON(), nullable=True))
    op.add_column('defect_records', sa.Column('rag_model_used', sa.String(100), nullable=True))
    op.add_column('defect_records', sa.Column('rag_query_time_ms', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('defect_records', 'rag_query_time_ms')
    op.drop_column('defect_records', 'rag_model_used')
    op.drop_column('defect_records', 'suggestion_sources')
    op.drop_column('defect_records', 'repair_suggestion')
