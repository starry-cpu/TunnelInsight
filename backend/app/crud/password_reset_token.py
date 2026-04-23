"""CRUD operations for password reset tokens"""
from datetime import datetime, timedelta
from typing import Optional, Any
import secrets

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.crud.base import CRUDBase
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.core.config import settings


class CRUDPasswordResetToken(CRUDBase[PasswordResetToken, Any, Any]):
    """密码重置令牌CRUD操作"""

    async def create_token(
        self,
        db: AsyncSession,
        user_id: str
    ) -> PasswordResetToken:
        """
        为用户创建密码重置令牌

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            PasswordResetToken: 创建的令牌
        """
        # 生成安全的随机令牌
        token = secrets.token_urlsafe(32)

        # 设置过期时间
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        )

        # 创建令牌记录
        db_obj = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )

        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)

        return db_obj

    async def get_valid_token(
        self,
        db: AsyncSession,
        token: str
    ) -> Optional[PasswordResetToken]:
        """
        获取有效的令牌(未过期、未使用)

        Args:
            db: 数据库会话
            token: 令牌字符串

        Returns:
            Optional[PasswordResetToken]: 令牌对象或None
        """
        result = await db.execute(
            select(PasswordResetToken).where(
                and_(
                    PasswordResetToken.token == token,
                    PasswordResetToken.expires_at > datetime.utcnow(),
                    PasswordResetToken.used_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()

    async def mark_token_used(
        self,
        db: AsyncSession,
        token_obj: PasswordResetToken
    ) -> None:
        """
        标记令牌为已使用

        Args:
            db: 数据库会话
            token_obj: 令牌对象
        """
        token_obj.used_at = datetime.utcnow()
        await db.flush()

    async def delete_expired_tokens(
        self,
        db: AsyncSession
    ) -> int:
        """
        删除所有过期的令牌

        Args:
            db: 数据库会话

        Returns:
            int: 删除的令牌数量
        """
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.expires_at < datetime.utcnow()
            )
        )
        expired_tokens = result.scalars().all()

        count = 0
        for token in expired_tokens:
            await db.delete(token)
            count += 1

        await db.flush()
        return count


# 全局实例
password_reset_token = CRUDPasswordResetToken(PasswordResetToken)
