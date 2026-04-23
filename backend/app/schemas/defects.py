from pydantic import BaseModel, Field, field_serializer
from typing import Optional, Dict, List
from datetime import datetime
from uuid import UUID


class AnalysisSettings(BaseModel):
    temperature: float = Field(default=1.0, ge=0.1, le=2.0)
    top_k: int = Field(default=10, ge=1, le=100)
    max_tokens: int = Field(default=1024, ge=100, le=4096)
    top_p: float = Field(default=0.95, ge=0.1, le=1.0)
    instruction: str = "你是一位土木工程领域的专家，专注于隧道结构缺陷的识别与评估。"


class DefectAnalyzeRequest(BaseModel):
    tunnel_id: Optional[str] = None
    location_id: Optional[str] = None
    stake_mark: Optional[str] = None
    direction: Optional[str] = Field(None, pattern="^(left|right|top|bottom)$")
    settings: AnalysisSettings = Field(default_factory=AnalysisSettings)


class RepairSuggestion(BaseModel):
    """修复建议模型"""
    suggestion: str = Field(description="修复建议内容")
    sources: List[str] = Field(default_factory=list, description="引用来源列表")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="置信度")
    fallback: bool = Field(default=False, description="是否为降级结果（通用建议）")


class DefectAnalyzeResponse(BaseModel):
    """缺陷分析响应 - 包含缺陷检测和修复建议"""
    id: str
    image_path: str

    # 缺陷检测结果
    final_result: str
    defect_type: str
    severity: str
    inference_time_ms: int

    # 修复建议
    repair_suggestion: Optional[RepairSuggestion] = None
    rag_available: bool = False
    rag_query_time_ms: int = 0

    created_at: str

    class Config:
        from_attributes = True


class DefectRecordResponse(BaseModel):
    id: UUID
    user_id: UUID
    tunnel_id: Optional[UUID]
    location_id: Optional[UUID]
    image_path: str
    final_result: str
    raw_response: Optional[str]
    model_used: str
    inference_time_ms: Optional[int]
    settings: AnalysisSettings
    defect_type: Optional[str]

    # 位置信息
    stake_mark: Optional[str] = None
    direction: Optional[str] = None

    severity: Optional[str]

    # 修复建议
    repair_suggestion: Optional[str] = None
    suggestion_sources: Optional[List[str]] = None
    rag_model_used: Optional[str] = None
    rag_query_time_ms: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer('id', 'user_id', 'tunnel_id', 'location_id')
    def serialize_uuid(self, value: UUID) -> Optional[str]:
        """Serialize UUID to string"""
        return str(value) if value else None

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value: datetime) -> str:
        """Serialize datetime to ISO format string"""
        return value.isoformat()


# ============= 演变分析相关 Schema =============

class EvolutionAnalysisRequest(BaseModel):
    """演变分析请求"""
    defect_ids: list[str] = Field(..., min_length=2, description="至少需要2条记录ID")


class EvolutionScores(BaseModel):
    """演变分析评分"""
    deterioration_rate: float = Field(..., ge=1.0, le=10.0, description="恶化速度 1-10")
    risk_level: str = Field(..., pattern="^(low|medium|high|critical)$", description="风险等级")
    urgency_score: float = Field(..., ge=1.0, le=10.0, description="紧急程度 1-10")


class EvolutionReport(BaseModel):
    """演变分析报告"""
    timeline_summary: str = Field(description="时间线总结")
    trend: str = Field(..., pattern="^(deteriorating|stable|improving)$", description="演变趋势")
    cause_analysis: str = Field(description="演变原因分析")
    repair_priority: str = Field(description="修复优先级建议")
    future_prediction: str = Field(description="未来发展趋势预测")


class EvolutionTimeRange(BaseModel):
    """时间范围"""
    start: str
    end: str


class EvolutionAnalysisResponse(BaseModel):
    """演变分析响应"""
    analysis_id: str
    stake_mark: str
    direction: str
    time_range: EvolutionTimeRange
    records_analyzed: int
    scores: EvolutionScores
    report: EvolutionReport
    records: list[DefectRecordResponse]
    created_at: str

    class Config:
        from_attributes = True

