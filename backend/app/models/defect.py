from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy import JSON
from sqlalchemy.sql import func
import uuid

from app.database import Base


class DefectRecord(Base):
    __tablename__ = "defect_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tunnel_id = Column(String(36), ForeignKey("tunnels.id", ondelete="SET NULL"))
    location_id = Column(String(36), ForeignKey("locations.id", ondelete="SET NULL"))

    image_path = Column(Text, nullable=False)
    final_result = Column(Text, nullable=False)
    raw_response = Column(Text)
    model_used = Column(String(100), default="qwen2.5-vl-7b-instruct")
    inference_time_ms = Column(Integer)

    settings_json = Column(JSON)

    defect_type = Column(String(100))
    severity = Column(String(20))

    # 位置分类字段
    stake_mark = Column(String(50), nullable=True, comment="桩号，如 K12+345")
    direction = Column(String(20), nullable=True, comment="方向：left/right/top/bottom")

    # RAG 修复建议相关字段
    repair_suggestion = Column(Text, nullable=True, comment="RAG 生成的修复建议")
    suggestion_sources = Column(JSON, nullable=True, comment="修复建议引用来源")
    rag_model_used = Column(String(100), nullable=True, comment="RAG 使用的模型")
    rag_query_time_ms = Column(Integer, nullable=True, comment="RAG 查询耗时(ms)")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
