#!/usr/bin/env python3
"""Helper script to run database migrations - MySQL version"""

import asyncio
import sys
from pathlib import Path

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.database import Base

# Import all models to ensure they are registered with Base
from app.models import User, Tunnel, DefectRecord, Project, PasswordResetToken, Location  # noqa


async def create_database():
    """Create database if it doesn't exist (MySQL version)"""
    import pymysql

    # 从 DATABASE_URL 或 settings 获取连接信息
    db_url = settings.DATABASE_URL

    # 解析数据库连接参数
    # 格式: mysql+aiomysql://user:password@host:port/dbname
    import re
    match = re.match(r'mysql\+aiomysql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)

    if match:
        db_user, db_password, db_host, db_port, db_name = match.groups()
    else:
        # 使用 settings 中的配置
        db_host = getattr(settings, 'DB_HOST', 'localhost')
        db_port = getattr(settings, 'DB_PORT', 3306)
        db_user = settings.DB_USER
        db_password = settings.DB_PASSWORD
        db_name = settings.DB_NAME

    # Connect to MySQL server (without specifying database)
    try:
        conn = pymysql.connect(
            host=db_host,
            port=int(db_port),
            user=db_user,
            password=db_password,
            charset="utf8mb4"
        )
        conn.autocommit = True
        cursor = conn.cursor()

        # Check if database exists
        cursor.execute(
            "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = %s",
            (db_name,)
        )
        exists = cursor.fetchone()

        if not exists:
            print(f"Creating database: {db_name}")
            cursor.execute(
                f"CREATE DATABASE `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            print(f"Database {db_name} created successfully")
        else:
            print(f"Database {db_name} already exists")

        cursor.close()
        conn.close()

    except pymysql.Error as e:
        print(f"Database connection error: {e}")
        raise


async def init_db():
    """Initialize database with tables"""
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    # Import all models here to ensure they are registered with Base
    from app.models import User, Tunnel, DefectRecord, Project, PasswordResetToken, Location

    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)

    print("Database tables created successfully")
    await engine.dispose()


async def drop_all_tables():
    """Drop all tables (USE WITH CAUTION)"""
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    print("All tables dropped")
    await engine.dispose()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Database management utility - MySQL")
    parser.add_argument(
        "command",
        choices=["create-db", "init", "drop", "reset"],
        help="Command to execute"
    )

    args = parser.parse_args()

    if args.command == "create-db":
        asyncio.run(create_database())
    elif args.command == "init":
        asyncio.run(init_db())
    elif args.command == "drop":
        confirm = input("Are you sure you want to drop all tables? (yes/no): ")
        if confirm.lower() == "yes":
            asyncio.run(drop_all_tables())
        else:
            print("Operation cancelled")
    elif args.command == "reset":
        confirm = input("Are you sure you want to reset the database? This will drop all tables! (yes/no): ")
        if confirm.lower() == "yes":
            asyncio.run(drop_all_tables())
            asyncio.run(init_db())
        else:
            print("Operation cancelled")
