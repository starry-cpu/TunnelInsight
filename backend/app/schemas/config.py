"""Pydantic schemas for severity and status level configuration."""

import re
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime
from uuid import UUID


# Pattern for valid keys: lowercase letters, numbers, and underscores only
KEY_PATTERN = re.compile(r'^[a-z][a-z0-9_]*$')


# =============================================================================
# SeverityLevel Schemas
# =============================================================================

class SeverityLevelBase(BaseModel):
    """Base schema for severity level."""
    key: str = Field(..., min_length=1, max_length=50, description="Unique identifier key")
    label: str = Field(..., min_length=1, max_length=100, description="Display label")
    score_weight: int = Field(..., ge=0, description="Weight for score calculation")
    color: str = Field(..., min_length=1, max_length=50, description="Display color (hex or name)")
    sort_order: int = Field(default=0, ge=0, description="Sort order")
    is_active: bool = Field(default=True, description="Whether the level is active")

    @field_validator('key')
    @classmethod
    def validate_key(cls, v: str) -> str:
        """Validate key format: lowercase letters, numbers, underscores, must start with letter."""
        if not KEY_PATTERN.match(v):
            raise ValueError('Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores')
        return v


class SeverityLevelCreate(SeverityLevelBase):
    """Schema for creating a severity level."""
    pass


class SeverityLevelUpdate(BaseModel):
    """Schema for updating a severity level."""
    key: Optional[str] = Field(None, min_length=1, max_length=50)
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    score_weight: Optional[int] = Field(None, ge=0)
    color: Optional[str] = Field(None, min_length=1, max_length=50)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

    @field_validator('key')
    @classmethod
    def validate_key(cls, v: Optional[str]) -> Optional[str]:
        """Validate key format if provided."""
        if v is not None and not KEY_PATTERN.match(v):
            raise ValueError('Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores')
        return v


class SeverityLevelResponse(SeverityLevelBase):
    """Schema for severity level response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('id', mode='before')
    @classmethod
    def serialize_id(cls, v):
        """Serialize UUID to string."""
        return str(v)

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def serialize_datetime(cls, v):
        """Serialize datetime to ISO format string."""
        return v.isoformat() if v else None


# =============================================================================
# StatusLevel Schemas
# =============================================================================

class StatusLevelBase(BaseModel):
    """Base schema for status level."""
    key: str = Field(..., min_length=1, max_length=50, description="Unique identifier key")
    label: str = Field(..., min_length=1, max_length=100, description="Display label")
    min_score: int = Field(..., ge=0, description="Minimum score for this status")
    max_score: Optional[int] = Field(None, ge=0, description="Maximum score for this status (null = infinity)")
    color: str = Field(..., min_length=1, max_length=50, description="Display color (hex or name)")
    sort_order: int = Field(default=0, ge=0, description="Sort order")
    is_active: bool = Field(default=True, description="Whether the level is active")

    @field_validator('key')
    @classmethod
    def validate_key(cls, v: str) -> str:
        """Validate key format: lowercase letters, numbers, underscores, must start with letter."""
        if not KEY_PATTERN.match(v):
            raise ValueError('Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores')
        return v

    @model_validator(mode='after')
    def validate_score_range(self):
        """Validate that max_score > min_score if both are provided."""
        if self.max_score is not None and self.max_score <= self.min_score:
            raise ValueError('max_score must be greater than min_score')
        return self


class StatusLevelCreate(StatusLevelBase):
    """Schema for creating a status level."""
    pass


class StatusLevelUpdate(BaseModel):
    """Schema for updating a status level."""
    key: Optional[str] = Field(None, min_length=1, max_length=50)
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    min_score: Optional[int] = Field(None, ge=0)
    max_score: Optional[int] = Field(None, ge=0)
    color: Optional[str] = Field(None, min_length=1, max_length=50)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

    @field_validator('key')
    @classmethod
    def validate_key(cls, v: Optional[str]) -> Optional[str]:
        """Validate key format if provided."""
        if v is not None and not KEY_PATTERN.match(v):
            raise ValueError('Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores')
        return v

    @model_validator(mode='after')
    def validate_score_range(self):
        """Validate that max_score > min_score if both are provided."""
        if (self.max_score is not None and self.min_score is not None
                and self.max_score <= self.min_score):
            raise ValueError('max_score must be greater than min_score')
        return self


class StatusLevelResponse(StatusLevelBase):
    """Schema for status level response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('id', mode='before')
    @classmethod
    def serialize_id(cls, v):
        """Serialize UUID to string."""
        return str(v)

    @field_validator('created_at', 'updated_at', mode='before')
    @classmethod
    def serialize_datetime(cls, v):
        """Serialize datetime to ISO format string."""
        return v.isoformat() if v else None
