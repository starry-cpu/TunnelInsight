from alembic import context
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app.models import User, Tunnel, DefectRecord


def get_url():
    """Get database URL from settings"""
    from app.core.config import settings
    return settings.DATABASE_URL


# override sqlalchemy.url with the one from settings
config = context.config
config.set_main_option("sqlalchemy.url", get_url())

# Set target metadata
target_metadata = Base.metadata


def run_migrations_online():
    """Run migrations in 'online' mode."""
    from sqlalchemy.ext.asyncio import create_async_engine
    import asyncio
    from app.core.config import settings

    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async def do_run_migrations():
        async with engine.begin() as connection:
            await connection.run_sync(do_run_migrations_sync)

    def do_run_migrations_sync(connection):
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

    asyncio.run(do_run_migrations())

    engine.dispose()


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
