"""
系统基础接口
提供健康检查和系统信息查询
"""
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["系统"])
async def health_check():
    """健康检查接口 — 用于监控和负载均衡探测"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/api/system/info", tags=["系统"])
async def system_info():
    """返回系统基本信息，前端根据此接口判断各功能模块是否已配置"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "llm_configured": bool(settings.llm_api_key),
        "llm_model": settings.llm_model,
        "embedding_model": settings.embedding_model,
        "asr_provider": settings.asr_provider,
        "tts_provider": settings.tts_provider,
    }
