from pydantic import BaseModel, Field, field_serializer
from typing import Optional, Dict
from datetime import datetime
from uuid import UUID


class SeverityCounts(BaseModel):
    """缺陷严重程度计数"""
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class TunnelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    length_km: Optional[float] = Field(None, ge=0)
    longitude: Optional[float] = Field(None, ge=-180, le=180, description='经度')
    latitude: Optional[float] = Field(None, ge=-90, le=90, description='纬度')


class TunnelCreate(TunnelBase):
    """创建隧道请求 - 必须指定项目"""
    project_id: str = Field(..., description="所属项目ID")


class TunnelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    location: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    length_km: Optional[float] = Field(None, ge=0)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    latitude: Optional[float] = Field(None, ge=-90, le=90)


class TunnelResponse(TunnelBase):
    id: UUID
    user_id: UUID
    project_id: UUID
    total_defects: Optional[int] = 0
    severity_counts: Optional[SeverityCounts] = None
    unique_location_count: int = 0
    health_index: int = 100
    last_analysis_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('id', 'user_id', 'project_id')
    def serialize_uuid(self, value: UUID) -> str:
        """Serialize UUID to string"""
        return str(value)

    @field_serializer('created_at', 'updated_at', 'last_analysis_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime to ISO format string"""
        return value.isoformat() if value else None
