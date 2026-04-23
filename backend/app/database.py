from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# MySQL 连接池配置
# pool_pre_ping: 检测断开的连接，对 MySQL 很重要
# pool_size: 连接池大小
# max_overflow: 最大溢出连接数（超过 pool_size 时可创建的额外连接）
# pool_recycle: 连接回收时间（秒），MySQL 默认 8 小时断开空闲连接
# pool_timeout: 获取连接的超时时间（秒）
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_timeout=30,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    """Dependency for getting async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
