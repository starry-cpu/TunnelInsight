from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_current_active_user
from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash
from app.crud.user import user as user_crud
from app.crud.password_reset_token import password_reset_token as token_crud
from app.database import get_db
from app.models.user import User
from app.services.email_service import email_service
from app.schemas.auth import (
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.schemas.common import ApiResponse

router = APIRouter()


@router.post("/register", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user"""
    # Check if user exists
    existing_user = await user_crud.get_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    existing_user = await user_crud.get_by_username(db, user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create user
    user = await user_crud.create(db, user_in)

    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(user)},
        meta={"timestamp": user.created_at.isoformat()}
    )


@router.post("/login", response_model=ApiResponse)
async def login(
    form_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """User login"""
    # Try to authenticate with email first, then username
    auth_user = await user_crud.authenticate(db, form_data.username, form_data.password)

    if not auth_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(seconds=settings.ACCESS_TOKEN_EXPIRE_SECONDS)
    access_token = create_access_token(
        data={"sub": str(auth_user.id)}, expires_delta=access_token_expires
    )

    return ApiResponse(
        success=True,
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_SECONDS,
            "user": UserResponse.model_validate(auth_user),
        }
    )


@router.post("/forgot-password", response_model=ApiResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset email"""
    # 查找用户
    user = await user_crud.get_by_email(db, request.email)

    # 即使用户不存在也返回成功,避免邮箱枚举攻击
    if not user:
        return ApiResponse(
            success=True,
            data={
                "message": "If the email exists, a password reset link has been sent"
            }
        )

    # 创建密码重置令牌
    token_obj = await token_crud.create_token(db, str(user.id))
    await db.commit()

    # 发送邮件
    email_sent = await email_service.send_password_reset_email(
        to_email=user.email,
        reset_token=token_obj.token,
        username=user.username
    )

    # 开发环境: 返回token方便测试
    response_data = {
        "message": "If the email exists, a password reset link has been sent"
    }

    if not settings.EMAIL_ENABLED:
        # 开发环境返回token
        response_data["token"] = token_obj.token
        response_data["debug_mode"] = True

    return ApiResponse(
        success=True,
        data=response_data
    )


@router.post("/reset-password", response_model=ApiResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password with token"""
    # 验证令牌
    token_obj = await token_crud.get_valid_token(db, request.token)

    if not token_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # 获取用户
    user = await user_crud.get(db, str(token_obj.user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 更新密码
    user.password_hash = get_password_hash(request.new_password)

    # 标记令牌为已使用
    await token_crud.mark_token_used(db, token_obj)

    await db.commit()

    return ApiResponse(
        success=True,
        data={"message": "Password has been reset successfully"}
    )


@router.get("/me", response_model=ApiResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
):
    """Get current user information"""
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(current_user)}
    )


@router.put("/me", response_model=ApiResponse)
async def update_current_user(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user information"""
    user = await user_crud.update(db, current_user, user_in)
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(user)}
    )


@router.post("/change-password", response_model=ApiResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password for authenticated user"""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )

    password_hash = get_password_hash(request.new_password)
    current_user.password_hash = password_hash
    await db.commit()

    return ApiResponse(
        success=True,
        data={"message": "Password changed successfully"}
    )
