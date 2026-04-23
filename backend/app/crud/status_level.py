"""CRUD operations for StatusLevel model."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from app.models.status_level import StatusLevel
from app.schemas.config import StatusLevelCreate, StatusLevelUpdate
from app.crud.base import CRUDBase


class CRUDStatusLevel(CRUDBase[StatusLevel, StatusLevelCreate, StatusLevelUpdate]):
    """CRUD operations for StatusLevel."""

    async def get_all_active(self, db: AsyncSession) -> List[StatusLevel]:
        """Get all active status levels sorted by sort_order."""
        result = await db.execute(
            select(StatusLevel)
            .where(StatusLevel.is_active == True)
            .order_by(StatusLevel.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_key(self, db: AsyncSession, key: str) -> Optional[StatusLevel]:
        """Get a status level by its unique key."""
        result = await db.execute(
            select(StatusLevel).where(StatusLevel.key == key)
        )
        return result.scalar_one_or_none()

    async def get_max_sort_order(self, db: AsyncSession) -> int:
        """Get the highest sort_order value, or -1 if no records exist."""
        result = await db.execute(
            select(func.max(StatusLevel.sort_order))
        )
        max_order = result.scalar()
        return max_order if max_order is not None else -1

    async def get_all(self, db: AsyncSession) -> List[StatusLevel]:
        """Get all status levels (including inactive) sorted by sort_order."""
        result = await db.execute(
            select(StatusLevel).order_by(StatusLevel.sort_order)
        )
        return list(result.scalars().all())


# Create a singleton instance
status_level = CRUDStatusLevel(StatusLevel)
