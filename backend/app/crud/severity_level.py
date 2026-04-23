"""CRUD operations for SeverityLevel model."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from app.models.severity_level import SeverityLevel
from app.schemas.config import SeverityLevelCreate, SeverityLevelUpdate
from app.crud.base import CRUDBase


class CRUDSeverityLevel(CRUDBase[SeverityLevel, SeverityLevelCreate, SeverityLevelUpdate]):
    """CRUD operations for SeverityLevel."""

    async def get_all_active(self, db: AsyncSession) -> List[SeverityLevel]:
        """Get all active severity levels sorted by sort_order."""
        result = await db.execute(
            select(SeverityLevel)
            .where(SeverityLevel.is_active == True)
            .order_by(SeverityLevel.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_key(self, db: AsyncSession, key: str) -> Optional[SeverityLevel]:
        """Get a severity level by its unique key."""
        result = await db.execute(
            select(SeverityLevel).where(SeverityLevel.key == key)
        )
        return result.scalar_one_or_none()

    async def get_max_sort_order(self, db: AsyncSession) -> int:
        """Get the highest sort_order value, or -1 if no records exist."""
        result = await db.execute(
            select(func.max(SeverityLevel.sort_order))
        )
        max_order = result.scalar()
        return max_order if max_order is not None else -1

    async def get_all(self, db: AsyncSession) -> List[SeverityLevel]:
        """Get all severity levels (including inactive) sorted by sort_order."""
        result = await db.execute(
            select(SeverityLevel).order_by(SeverityLevel.sort_order)
        )
        return list(result.scalars().all())


# Create a singleton instance
severity_level = CRUDSeverityLevel(SeverityLevel)
