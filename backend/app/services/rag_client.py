"""
RAG Service Client - LightRAG API 客户端
用于从 LightRAG 服务获取隧道缺陷修复建议
"""
from typing import Dict, Any, Optional
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class RAGServiceClient:
    """LightRAG API 客户端"""

    def __init__(self, base_url: str = None, timeout: float = None):
        self.base_url = base_url or settings.RAG_SERVICE_URL
        self.timeout = timeout or settings.RAG_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """懒加载 HTTP 客户端"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self):
        """关闭 HTTP 客户端连接"""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def health_check(self) -> bool:
        """
        检查 LightRAG 服务是否可用

        Returns:
            bool: 服务是否健康
        """
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"LightRAG health check failed: {e}")
            return False

    async def get_repair_suggestion(
        self,
        defect_type: str,
        defect_description: str,
        severity: str
    ) -> Optional[Dict[str, Any]]:
        """
        根据缺陷信息查询修复建议

        Args:
            defect_type: 缺陷类型 (裂缝, 渗水, 剥落 等)
            defect_description: 缺陷详细描述
            severity: 严重程度 (high, medium, low)

        Returns:
            {
                "suggestion": "修复建议文本",
                "sources": ["引用的文档片段"],
                "confidence": 0.85
            }
            或 None (如果服务不可用)
        """
        # 构建查询
        query = self._build_query(defect_type, defect_description, severity)

        try:
            response = await self.client.post(
                f"{self.base_url}/query",
                json={
                    "query": query,
                    "mode": "hybrid",
                    "response_type": "Multiple Paragraphs"
                }
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    "suggestion": data.get("response", ""),
                    "sources": [],  # LightRAG 可以配置返回来源
                    "confidence": 0.8
                }
            else:
                logger.error(f"LightRAG query failed: {response.status_code}")
                return None

        except httpx.TimeoutException:
            logger.error("LightRAG query timeout")
            return None
        except Exception as e:
            logger.error(f"LightRAG query error: {e}")
            return None

    def _build_query(
        self,
        defect_type: str,
        defect_description: str,
        severity: str
    ) -> str:
        """构建 RAG 查询语句"""
        severity_cn = {
            "high": "严重",
            "medium": "中等",
            "low": "轻微"
        }.get(severity, severity)

        return f"""基于以下隧道缺陷信息，请提供专业的修复建议：

缺陷类型：{defect_type}
严重程度：{severity_cn}
详细描述：{defect_description}

请提供：
1. 修复方案建议
2. 所需材料和工艺要求
3. 施工注意事项
4. 后续监测建议"""


# 全局单例
rag_client = RAGServiceClient()
