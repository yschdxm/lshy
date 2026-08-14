"""
多模态工具 — Agent 可调用此工具分析用户上传的图片
==============================================
拍照问路、识景讲解
"""
from app.services.multimodal_service import multimodal_service


def analyze_image(image_base64: str, question: str = "") -> dict:
    """
    Agent 工具：分析用户上传的图片

    Args:
        image_base64: 图片 Base64 编码（不含 data URI 前缀）
        question: 关于图片的问题（可选）

    Returns:
        图片分析结果
    """
    if not multimodal_service.is_available:
        return {"error": "多模态模型未配置（需要 SiliconFlow Qwen-VL 或兼容 API）"}

    return multimodal_service.analyze_image(image_base64, question)
