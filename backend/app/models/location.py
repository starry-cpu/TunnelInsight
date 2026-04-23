from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, CheckConstraint, text
from sqlalchemy.sql import func
import uuid

from app.database import Base


class Location(Base):
    """位置模型 - 记录隧道内的具体位置"""
    __tablename__ = "locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tunnel_id = Column(
        String(36),
        ForeignKey("tunnels.id", ondelete="CASCADE"),
        nullable=False
    )
    stake_mark = Column(String(50), nullable=False)  # 桩号，如 K12+345
    direction = Column(String(20), nullable=False)  # 方向：left/right/top/bottom
    position_description = Column(String(500))  # 位置描述
    longitude = Column(Numeric(10, 7))  # 经度（可选）
    latitude = Column(Numeric(10, 7))   # 纬度（可选）

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 约束：同一隧道内的同一桩号和方向唯一
    __table_args__ = (
        CheckConstraint(
            "direction IN ('left', 'right', 'top', 'bottom')",
            name='check_direction'
        ),
    )
