from sqlalchemy import Column, String, Text, Numeric, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Tunnel(Base):
    """隧道模型 - 必须属于某个项目"""

    __tablename__ = "tunnels"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    location = Column(String(500))
    description = Column(Text)
    length_km = Column(Numeric(10, 2))
    longitude = Column(Numeric(10, 7), nullable=True, comment='经度')
    latitude = Column(Numeric(10, 7), nullable=True, comment='纬度')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="tunnels")
