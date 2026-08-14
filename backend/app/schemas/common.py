"""
通用 Pydantic Schema
答辩要点：统一的分页响应格式和错误响应格式
"""
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应"""
    items: List[T]
    total: int
    page: int
    page_size: int

    class Config:
        from_attributes = True
