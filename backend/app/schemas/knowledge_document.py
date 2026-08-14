"""
知识库文档 Pydantic Schema
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class KnowledgeDocBase(BaseModel):
    """知识库文档基础字段"""
    title: str = Field(..., min_length=1, description="文档标题")
    category: str = "景点资料"
    content: Optional[str] = None
    source_file: Optional[str] = None
    status: str = "已发布"


class KnowledgeDocCreate(KnowledgeDocBase):
    """创建文档请求"""
    pass


class KnowledgeDocUpdate(BaseModel):
    """更新文档请求"""
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    source_file: Optional[str] = None
    status: Optional[str] = None


class KnowledgeDocResponse(KnowledgeDocBase):
    """文档响应"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
