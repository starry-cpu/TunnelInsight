from pydantic import BaseModel, EmailStr, Field, field_serializer
from typing import Optional
from datetime import datetime
from uuid import UUID


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72, description="Password (8-72 characters)")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    locale: Optional[str] = "zh-CN"


class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    locale: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        """Serialize UUID to string"""
        return str(value)

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime to ISO format string"""
        return value.isoformat()


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenResponse(Token):
    user: UserResponse


class LoginRequest(BaseModel):
    username: str
    password: str
    grant_type: str = "password"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=100)
