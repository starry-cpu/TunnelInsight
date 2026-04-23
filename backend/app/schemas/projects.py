from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.schemas.tunnels import SeverityCounts


class ProjectBase(BaseModel):
    """项目基础字段"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    """创建项目请求"""
    pass


class ProjectUpdate(BaseModel):
    """更新项目请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectResponse(ProjectBase):
    """项目响应"""
    id: UUID
    user_id: UUID
    tunnel_count: int = 0
    total_defects: int = 0
    severity_counts: Optional[SeverityCounts] = None
    unique_location_count: int = 0
    health_index: int = 100
    status: Dict[str, Any] = Field(default_factory=lambda: {'key': 'normal', 'label': '运行正常', 'color': 'success'})
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, value: UUID) -> str:
        """Serialize UUID to string"""
        return str(value)

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime to ISO format string"""
        return value.isoformat() if value else None


class TunnelBrief(BaseModel):
    """隧道简要信息（用于项目详情中）"""
    id: UUID
    name: str
    location: Optional[str] = None
    length_km: Optional[float] = None
    total_defects: int = 0
    severity_counts: Optional[SeverityCounts] = None
    unique_location_count: int = 0
    health_index: int = 100

    @field_serializer('id')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)


class ProjectDetailResponse(ProjectResponse):
    """项目详情响应（包含隧道列表）"""
    tunnels: List[TunnelBrief] = []
