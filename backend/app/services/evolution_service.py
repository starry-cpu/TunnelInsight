"""演变分析服务"""
import logging
import time
import json
from typing import Any

from app.core.config import settings
from app.models.defect import DefectRecord

logger = logging.getLogger(__name__)

# 演变分析 Prompt 模板
EVOLUTION_PROMPT_TEMPLATE = """你是一位隧道结构安全专家。请分析以下同一位置在不同时间的缺陷记录，输出演变分析报告。

位置：{stake_mark} {direction_text}
时间跨度：{start_date} 至 {end_date}（共 {count} 条记录）

【时间线数据】
{timeline_data}

请以 JSON 格式输出（不要包含 ```json 标记）：
{{
  "deterioration_rate": 评分1-10,
  "risk_level": "low/medium/high/critical",
  "urgency_score": 评分1-10,
  "timeline_summary": "时间线总结（中文）",
  "trend": "deteriorating/stable/improving",
  "cause_analysis": "演变原因分析（中文）",
  "repair_priority": "修复优先级建议（中文）",
  "future_prediction": "未来发展趋势预测（中文）"
}}
"""


class EvolutionAnalysisService:
    """演变分析服务 - 单例模式"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._ai_service = None
        self._mock_mode = False

    async def _ensure_service(self):
        """延迟加载 AI 服务"""
        if self._ai_service is not None or self._mock_mode:
            return

        try:
            from app.services.ai_service import ai_service
            if ai_service.is_available():
                self._ai_service = ai_service
                logger.info("EvolutionAnalysisService: 使用 AIService")
            else:
                self._mock_mode = True
                logger.warning("EvolutionAnalysisService: AI 服务不可用，启用 mock 模式")
        except Exception as e:
            self._mock_mode = True
            logger.warning(f"EvolutionAnalysisService: 加载失败，启用 mock 模式: {e}")

    def _build_timeline_data(self, records: list[DefectRecord]) -> str:
        """构建时间线数据字符串"""
        lines = []
        direction_map = {
            'left': '左侧', 'right': '右侧',
            'top': '拱顶', 'bottom': '仰拱'
        }

        for i, record in enumerate(records, 1):
            direction_text = direction_map.get(record.direction, record.direction or '未知')
            severity_text = record.severity or '未知'
            defect_type = record.defect_type or '未知'

            # 截取分析结果的摘要
            result_summary = record.final_result[:200] if record.final_result else ''
            if len(record.final_result or '') > 200:
                result_summary += '...'

            lines.append(
                f"{i}. {record.created_at.strftime('%Y-%m-%d %H:%M')} | "
                f"严重程度: {severity_text} | "
                f"类型: {defect_type} | "
                f"描述: {result_summary}"
            )

        return '\n'.join(lines)

    def _parse_ai_response(self, response_text: str) -> dict[str, Any]:
        """解析 AI 响应为 JSON"""
        try:
            text = response_text.strip()
            if text.startswith('```'):
                lines = text.split('\n')
                text = '\n'.join(lines[1:-1] if lines[-1] == '```' else lines[1:])

            result = json.loads(text)

            required_fields = ['deterioration_rate', 'risk_level', 'urgency_score',
                             'timeline_summary', 'trend', 'cause_analysis',
                             'repair_priority', 'future_prediction']

            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            raise ValueError(f"AI 响应格式错误: {e}")

    async def analyze_evolution(self, records: list[DefectRecord]) -> dict[str, Any]:
        """分析缺陷演变"""
        await self._ensure_service()

        if self._mock_mode:
            return self._mock_analyze(records)

        sorted_records = sorted(records, key=lambda r: r.created_at)
        first_record = sorted_records[0]
        stake_mark = first_record.stake_mark or '未知位置'
        direction = first_record.direction or '未知方向'

        direction_map = {'left': '左侧', 'right': '右侧', 'top': '拱顶', 'bottom': '仰拱'}
        direction_text = direction_map.get(direction, direction)

        timeline_data = self._build_timeline_data(sorted_records)

        prompt = EVOLUTION_PROMPT_TEMPLATE.format(
            stake_mark=stake_mark,
            direction_text=direction_text,
            start_date=sorted_records[0].created_at.strftime('%Y-%m-%d'),
            end_date=sorted_records[-1].created_at.strftime('%Y-%m-%d'),
            count=len(sorted_records),
            timeline_data=timeline_data
        )

        start_time = time.time()

        try:
            result = await self._ai_service.analyze_text(prompt)
            inference_time_ms = int((time.time() - start_time) * 1000)
            parsed = self._parse_ai_response(result)

            return {
                "scores": {
                    "deterioration_rate": float(parsed["deterioration_rate"]),
                    "risk_level": parsed["risk_level"],
                    "urgency_score": float(parsed["urgency_score"]),
                },
                "report": {
                    "timeline_summary": parsed["timeline_summary"],
                    "trend": parsed["trend"],
                    "cause_analysis": parsed["cause_analysis"],
                    "repair_priority": parsed["repair_priority"],
                    "future_prediction": parsed["future_prediction"],
                },
                "model_used": self._ai_service.model_name if hasattr(self._ai_service, 'model_name') else "qwen2.5-vl",
                "inference_time_ms": inference_time_ms,
            }

        except Exception as e:
            logger.error(f"Evolution analysis failed: {e}")
            return self._mock_analyze(records)

    def _mock_analyze(self, records: list[DefectRecord]) -> dict[str, Any]:
        """Mock 模式：返回模拟分析结果"""
        sorted_records = sorted(records, key=lambda r: r.created_at)

        return {
            "scores": {
                "deterioration_rate": 5.0,
                "risk_level": "medium",
                "urgency_score": 5.0,
            },
            "report": {
                "timeline_summary": "[Mock 模式] 模拟演变分析结果",
                "trend": "stable",
                "cause_analysis": "[Mock 模式] AI 服务暂不可用，无法分析演变原因",
                "repair_priority": "[Mock 模式] 请确保 AI 服务正常运行后重新分析",
                "future_prediction": "[Mock 模式] -",
            },
            "model_used": "mock",
            "inference_time_ms": 0,
        }

    def is_available(self) -> bool:
        """检查服务是否可用"""
        return not self._mock_mode


# 单例实例
evolution_service = EvolutionAnalysisService()
