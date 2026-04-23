from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import uuid

from app.models.user import User
from app.schemas.auth import UserCreate, UserUpdate, ForgotPasswordRequest
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, obj_in: UserCreate) -> User:
        """Create a new user with hashed password"""
        obj_in_data = obj_in.model_dump()
        password = obj_in_data.pop("password")
        password_hash = get_password_hash(password)
        obj_in_data["password_hash"] = password_hash
        db_obj = User(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def authenticate(
        self, db: AsyncSession, username_or_email: str, password: str
    ) -> Optional[User]:
        """Authenticate user by username or email and password"""
        # Try email first
        user = await self.get_by_email(db, username_or_email)
        if not user:
            # Try username
            user = await self.get_by_username(db, username_or_email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user


# Create a singleton instance
user = CRUDUser(User)
