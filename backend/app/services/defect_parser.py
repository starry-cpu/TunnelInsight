"""
缺陷信息解析工具
从 AI 分析结果中提取结构化信息
"""
from typing import Tuple
import re


def extract_defect_type(result_text: str) -> str:
    """
    从分析结果中提取缺陷类型

    Args:
        result_text: AI 模型返回的分析结果文本

    Returns:
        缺陷类型字符串 (裂缝, 渗水, 剥落, 变形, 腐蚀, 未知)
    """
    if not result_text:
        return "未知"

    # 按优先级检查缺陷类型关键词
    defect_keywords = {
        "裂缝": ["裂缝", "裂纹", "开裂", "断裂", "龟裂"],
        "渗水": ["渗水", "漏水", "涌水", "渗漏", "滴水", "淋水"],
        "剥落": ["剥落", "脱落", "掉块", "起皮", "剥离"],
        "变形": ["变形", "沉降", "隆起", "收敛", "位移"],
        "腐蚀": ["腐蚀", "锈蚀", "风化", "侵蚀", "碳化"],
    }

    result_lower = result_text.lower()

    for defect_type, keywords in defect_keywords.items():
        for keyword in keywords:
            if keyword in result_lower:
                return defect_type

    return "未知"


def extract_severity(result_text: str) -> str:
    """
    从分析结果中提取严重程度

    Args:
        result_text: AI 模型返回的分析结果文本

    Returns:
        严重程度字符串 (high, medium, low, unknown)
    """
    if not result_text:
        return "unknown"

    # 高严重程度关键词
    high_keywords = ["严重", "高危", "危险", "紧急", "立即", "高", "重大"]
    for keyword in high_keywords:
        if keyword in result_text:
            return "high"

    # 中等严重程度关键词
    medium_keywords = ["中等", "中", "一般", "普通", "需关注"]
    for keyword in medium_keywords:
        if keyword in result_text:
            return "medium"

    # 低严重程度关键词
    low_keywords = ["轻微", "低", "较小", "轻微", "不影响", "正常"]
    for keyword in low_keywords:
        if keyword in result_text:
            return "low"

    return "unknown"


def parse_inference_result(result_text: str) -> Tuple[str, str]:
    """
    解析推理结果，同时提取缺陷类型和严重程度

    Args:
        result_text: AI 模型返回的分析结果文本

    Returns:
        (缺陷类型, 严重程度) 元组
    """
    defect_type = extract_defect_type(result_text)
    severity = extract_severity(result_text)
    return defect_type, severity


def get_generic_repair_suggestion(defect_type: str, severity: str) -> str:
    """
    获取通用的修复建议（降级时使用）

    Args:
        defect_type: 缺陷类型
        severity: 严重程度

    Returns:
        通用修复建议文本
    """
    suggestions = {
        "裂缝": {
            "high": "【紧急】建议立即进行结构安全评估，并采取加固措施。应组织专业人员进行详细检测，评估裂缝的深度和走向，必要时进行注浆加固或衬砌修复。",
            "medium": "建议安装裂缝监测设备，定期观察裂缝变化情况。可进行表面封闭处理防止渗水，如裂缝扩展应及时采取进一步措施。",
            "low": "建议进行表面封闭处理，防止渗水和进一步扩展。定期巡检观察变化情况。"
        },
        "渗水": {
            "high": "【紧急】建议立即排查水源，采取排水和防水措施。可能需要进行注浆堵漏，严重时应考虑衬砌加固。",
            "medium": "建议进行注浆堵漏处理，同时检查排水系统是否通畅。做好渗水记录，监测渗水量变化。",
            "low": "建议进行表面防水涂层处理，检查并清理周边排水设施。"
        },
        "剥落": {
            "high": "【紧急】建议立即清除松动部分，采取加固措施防止继续剥落。应评估结构安全性，必要时进行衬砌修复。",
            "medium": "建议清除松动部分，进行局部修复。安装监测设备观察剥落区域变化。",
            "low": "建议清除松动部分，进行表面修补处理。"
        },
        "变形": {
            "high": "【紧急】建议立即进行结构安全评估，监测变形速率。可能需要采取加固或纠偏措施。",
            "medium": "建议安装变形监测设备，定期监测变形情况。如变形速率加快应立即处理。",
            "low": "建议定期监测变形情况，记录变化趋势。"
        },
        "腐蚀": {
            "high": "【紧急】建议进行详细检测评估腐蚀程度，采取防腐蚀处理措施。可能需要更换受损构件。",
            "medium": "建议清除腐蚀层，进行防腐蚀处理。定期检查腐蚀发展情况。",
            "low": "建议进行表面防腐蚀处理，定期检查。"
        }
    }

    if defect_type in suggestions and severity in suggestions[defect_type]:
        return suggestions[defect_type][severity]

    return "建议联系专业工程师进行现场评估，制定针对性的修复方案。"
