from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.sql import func
import uuid

from app.database import Base


class EvolutionAnalysis(Base):
    """演变分析记录模型"""
    __tablename__ = "evolution_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tunnel_id = Column(String(36), ForeignKey("tunnels.id", ondelete="SET NULL"))

    # 位置信息
    stake_mark = Column(String(50), nullable=False)
    direction = Column(String(20), nullable=False)

    # 时间范围
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)

    # 分析的记录
    records_count = Column(Integer, nullable=False)
    analyzed_record_ids = Column(JSON, nullable=False)

    # 结构化评分
    deterioration_rate = Column(Numeric(3, 1), nullable=False)
    risk_level = Column(String(20), nullable=False)
    urgency_score = Column(Numeric(3, 1), nullable=False)

    # 详细报告
    timeline_summary = Column(Text)
    trend = Column(String(20))
    cause_analysis = Column(Text)
    repair_priority = Column(Text)
    future_prediction = Column(Text)

    # AI 元数据
    model_used = Column(String(100))
    inference_time_ms = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
