"""Add severity_levels and status_levels tables with default data

Revision ID: 004
Revises: 003
Create Date: 2026-03-13

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect
import uuid

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def table_exists(connection, table_name: str) -> bool:
    """Check if table exists."""
    inspector = inspect(connection)
    return table_name in inspector.get_table_names()


def table_has_data(connection, table_name: str) -> bool:
    """Check if table has any data."""
    result = connection.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
    count = result.scalar()
    return count > 0


def upgrade() -> None:
    conn = op.get_bind()

    # ============================================================
    # Step 1: Create severity_levels table
    # ============================================================
    if not table_exists(conn, 'severity_levels'):
        op.create_table(
            'severity_levels',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('key', sa.String(50), unique=True, nullable=False),
            sa.Column('label', sa.String(100), nullable=False),
            sa.Column('score_weight', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('color', sa.String(50), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('idx_severity_levels_key', 'severity_levels', ['key'])

    # ============================================================
    # Step 2: Create status_levels table
    # ============================================================
    if not table_exists(conn, 'status_levels'):
        op.create_table(
            'status_levels',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('key', sa.String(50), unique=True, nullable=False),
            sa.Column('label', sa.String(100), nullable=False),
            sa.Column('min_score', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('max_score', sa.Integer(), nullable=True),
            sa.Column('color', sa.String(50), nullable=False),
            sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        )
        op.create_index('idx_status_levels_key', 'status_levels', ['key'])

    # ============================================================
    # Step 3: Seed default severity levels (if empty)
    # Note: Using `key` with backticks because it's a MySQL reserved keyword
    # ============================================================
    if not table_has_data(conn, 'severity_levels'):
        severity_levels = [
            {
                'id': str(uuid.uuid4()),
                'key': 'low',
                'label': '低',
                'score_weight': 1,
                'color': 'success',
                'sort_order': 1,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'medium',
                'label': '中',
                'score_weight': 5,
                'color': 'warning',
                'sort_order': 2,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'high',
                'label': '高',
                'score_weight': 10,
                'color': 'error',
                'sort_order': 3,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'critical',
                'label': '严重',
                'score_weight': 20,
                'color': 'error',
                'sort_order': 4,
            },
        ]

        for level in severity_levels:
            conn.execute(
                text("""
                    INSERT INTO severity_levels
                    (id, `key`, label, score_weight, color, sort_order, is_active, created_at, updated_at)
                    VALUES (:id, :key, :label, :score_weight, :color, :sort_order, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                level
            )

    # ============================================================
    # Step 4: Seed default status levels (if empty)
    # Note: Using `key` with backticks because it's a MySQL reserved keyword
    # Status levels are based on health_index (0-100), higher is better
    # ============================================================
    if not table_has_data(conn, 'status_levels'):
        status_levels = [
            {
                'id': str(uuid.uuid4()),
                'key': 'normal',
                'label': '运行正常',
                'min_score': 80,
                'max_score': None,  # No upper bound (up to 100)
                'color': '#10b981',
                'sort_order': 1,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'minor',
                'label': '轻微警告',
                'min_score': 60,
                'max_score': 80,
                'color': '#3b82f6',
                'sort_order': 2,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'warning',
                'label': '一般警告',
                'min_score': 40,
                'max_score': 60,
                'color': '#f59e0b',
                'sort_order': 3,
            },
            {
                'id': str(uuid.uuid4()),
                'key': 'critical',
                'label': '严重警告',
                'min_score': 0,
                'max_score': 40,
                'color': '#ef4444',
                'sort_order': 4,
            },
        ]

        for level in status_levels:
            conn.execute(
                text("""
                    INSERT INTO status_levels
                    (id, `key`, label, min_score, max_score, color, sort_order, is_active, created_at, updated_at)
                    VALUES (:id, :key, :label, :min_score, :max_score, :color, :sort_order, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                level
            )


def downgrade() -> None:
    """Rollback migration."""
    conn = op.get_bind()

    # Drop tables in reverse order
    if table_exists(conn, 'status_levels'):
        try:
            op.drop_index('idx_status_levels_key', 'status_levels')
        except Exception:
            pass
        op.drop_table('status_levels')

    if table_exists(conn, 'severity_levels'):
        try:
            op.drop_index('idx_severity_levels_key', 'severity_levels')
        except Exception:
            pass
        op.drop_table('severity_levels')
