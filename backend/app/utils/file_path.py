"""
文件路径工具函数
"""
from pathlib import Path


def get_image_url(file_path: str) -> str:
    """
    将文件系统路径转换为可访问的 URL 路径

    Args:
        file_path: 文件系统路径（绝对路径或相对路径）

    Returns:
        可用于 HTTP 请求的 URL 路径（如 /uploads/xxx.jpg）

    Examples:
        >>> get_image_url("/opt/TunnelInsight/backend/uploads/abc.jpg")
        '/uploads/abc.jpg'
        >>> get_image_url("./uploads/abc.jpg")
        '/uploads/abc.jpg'
        >>> get_image_url("/uploads/abc.jpg")
        '/uploads/abc.jpg'
    """
    if not file_path:
        return ""

    # 已经是 URL 路径格式
    if file_path.startswith("/uploads/"):
        return file_path

    # 已经是完整 URL
    if file_path.startswith("http://") or file_path.startswith("https://"):
        return file_path

    # 从文件路径中提取文件名
    path = Path(file_path)
    filename = path.name

    return f"/uploads/{filename}"
