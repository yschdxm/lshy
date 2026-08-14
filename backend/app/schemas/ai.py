"""
AI 对话请求/响应 Schema
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """AI 对话请求"""
    session_id: str = Field(default="demo", description="会话 ID")
    message: str = Field(..., min_length=1, max_length=1000, description="用户消息")
    mode: str = Field(default="qa", description="模式：qa/guide/route")


class SourceInfo(BaseModel):
    """引用来源"""
    title: str
    type: str
    category: str


class ChatResponse(BaseModel):
    """AI 对话响应"""
    answer: str
    sources: List[SourceInfo] = []
    intent: str = ""
    emotion: str = "中性"
    response_time_ms: int = 0


class RebuildResponse(BaseModel):
    """重建索引响应"""
    status: str
    chunks: int = 0
    engine: str = ""
    error: Optional[str] = None
