from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.sql import func
import uuid

from app.database import Base


class StatusLevel(Base):
    __tablename__ = "status_levels"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(50), unique=True, nullable=False)
    label = Column(String(100), nullable=False)
    min_score = Column(Integer, nullable=False, default=0)
    max_score = Column(Integer, nullable=True)
    color = Column(String(50), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
