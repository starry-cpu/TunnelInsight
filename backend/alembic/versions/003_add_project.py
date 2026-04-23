"""Add projects table and project_id to tunnels

Revision ID: 003
Revises: 002
Create Date: 2026-03-08

兼容性：
- MySQL: 使用标准 ALTER TABLE
- SQLite: 使用临时默认值策略避免 ALTER COLUMN

数据迁移方案：
- 为每个现有隧道自动创建同名项目
- 将隧道关联到对应的项目

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect
import uuid

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def table_exists(connection, table_name: str) -> bool:
    """检查表是否存在"""
    inspector = inspect(connection)
    return table_name in inspector.get_table_names()


def column_exists(connection, table_name: str, column_name: str) -> bool:
    """检查列是否存在"""
    inspector = inspect(connection)
    if table_name not in inspector.get_table_names():
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    conn = op.get_bind()

    # ============================================================
    # Step 1: 创建 projects 表（如果不存在）
    # ============================================================
    if not table_exists(conn, 'projects'):
        op.create_table(
            'projects',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), nullable=False),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        )
        op.create_index('idx_projects_user_id', 'projects', ['user_id'])

    # ============================================================
    # Step 2: 添加 project_id 列（如果不存在）
    # ============================================================
    if not column_exists(conn, 'tunnels', 'project_id'):
        op.add_column('tunnels', sa.Column(
            'project_id',
            sa.String(36),
            nullable=True,  # 先允许 NULL，数据迁移后再改为 NOT NULL
        ))
        op.create_index('idx_tunnels_project_id', 'tunnels', ['project_id'])

    # ============================================================
    # Step 3: 数据迁移 - 为每个现有隧道创建同名项目
    # ============================================================
    # 获取所有没有 project_id 或 project_id 为空的隧道
    tunnels = conn.execute(
        text("SELECT id, user_id, name, description FROM tunnels WHERE project_id IS NULL OR project_id = ''")
    ).fetchall()

    for tunnel_id, user_id, name, description in tunnels:
        # 生成新的项目 ID
        new_project_id = str(uuid.uuid4())

        # 检查是否已有同名项目
        existing_project = conn.execute(
            text("SELECT id FROM projects WHERE user_id = :user_id AND name = :name"),
            {"user_id": user_id, "name": name}
        ).fetchone()

        if existing_project:
            # 使用已有项目
            new_project_id = existing_project[0]
        else:
            # 创建新项目
            conn.execute(
                text("""
                    INSERT INTO projects (id, user_id, name, description, created_at, updated_at)
                    VALUES (:id, :user_id, :name, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """),
                {
                    "id": new_project_id,
                    "user_id": user_id,
                    "name": name,
                    "description": description or f"由隧道「{name}」自动创建的项目",
                }
            )

        # 更新隧道的 project_id
        conn.execute(
            text("UPDATE tunnels SET project_id = :project_id WHERE id = :tunnel_id"),
            {"project_id": new_project_id, "tunnel_id": tunnel_id}
        )

    # ============================================================
    # Step 4: 检查并添加外键约束（如果不存在）
    # ============================================================
    inspector = inspect(conn)
    foreign_keys = inspector.get_foreign_keys('tunnels')
    fk_exists = any(fk['name'] == 'fk_tunnels_project_id' for fk in foreign_keys if fk.get('name'))

    if not fk_exists:
        # MySQL 需要 SET NULL 约束先让列允许 NULL，但我们要 CASCADE
        # 先确保所有隧道都有 project_id
        conn.execute(text("UPDATE tunnels SET project_id = NULL WHERE project_id = ''"))

        # 添加外键约束
        try:
            op.create_foreign_key(
                'fk_tunnels_project_id',
                'tunnels',
                'projects',
                ['project_id'],
                ['id'],
                ondelete='CASCADE'
            )
        except Exception as e:
            # 如果外键已存在，忽略错误
            if 'already exists' not in str(e).lower() and 'duplicate' not in str(e).lower():
                raise


def downgrade() -> None:
    """回滚迁移"""
    conn = op.get_bind()

    # 1. 尝试删除外键约束
    try:
        op.drop_constraint('fk_tunnels_project_id', 'tunnels', type_='foreignkey')
    except Exception:
        pass  # 约束可能不存在

    # 2. 删除 project_id 列
    if column_exists(conn, 'tunnels', 'project_id'):
        try:
            op.drop_index('idx_tunnels_project_id', 'tunnels')
        except Exception:
            pass
        op.drop_column('tunnels', 'project_id')

    # 3. 删除 projects 表
    if table_exists(conn, 'projects'):
        try:
            op.drop_index('idx_projects_user_id', 'projects')
        except Exception:
            pass
        op.drop_table('projects')
