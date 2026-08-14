"""
FAQ 问答条目 Pydantic Schema
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class FaqItemBase(BaseModel):
    """FAQ 基础字段"""
    question: str = Field(..., min_length=1, description="问题")
    answer: Optional[str] = None
    category: str = "通用"
    status: str = "已发布"


class FaqItemCreate(FaqItemBase):
    """创建 FAQ 请求"""
    pass


class FaqItemUpdate(BaseModel):
    """更新 FAQ 请求"""
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


class FaqItemResponse(FaqItemBase):
    """FAQ 响应"""
    id: int
    views: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
