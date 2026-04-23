from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, str]] = None
    meta: Optional[Dict[str, str]] = None


class PaginationParams(BaseModel):
    """Pagination parameters"""
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    sort_by: Optional[str] = None
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    items: list[Any]
    total: int
    skip: int
    limit: int
    has_next: bool
    has_prev: bool
