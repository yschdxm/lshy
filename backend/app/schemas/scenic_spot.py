"""
景点 Pydantic Schema
"""
from typing import Optional, List
from pydantic import BaseModel, Field
import json


class ScenicSpotBase(BaseModel):
    """景点基础字段"""
    scenic_area_name: str = "灵山风景名胜区"
    spot_id: str = Field(..., description="景点编号，如 LS-001")
    spot_name: str = Field(..., min_length=1, description="景点名称")
    location: Optional[str] = None
    parameters: Optional[str] = None
    core_function: Optional[str] = None
    cultural_meaning: Optional[str] = None
    detail_intro: Optional[str] = None
    highlights: Optional[str] = None
    opening_info: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None          # JSON 字符串
    recommended_duration: int = 30
    crowd_level: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sort_order: int = 0


class ScenicSpotCreate(ScenicSpotBase):
    """创建景点请求"""
    pass


class ScenicSpotUpdate(BaseModel):
    """更新景点请求 — 所有字段可选"""
    scenic_area_name: Optional[str] = None
    spot_name: Optional[str] = None
    location: Optional[str] = None
    parameters: Optional[str] = None
    core_function: Optional[str] = None
    cultural_meaning: Optional[str] = None
    detail_intro: Optional[str] = None
    highlights: Optional[str] = None
    opening_info: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    recommended_duration: Optional[int] = None
    crowd_level: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sort_order: Optional[int] = None


class ScenicSpotResponse(ScenicSpotBase):
    """景点响应"""
    id: int
    tags_list: Optional[List[str]] = None  # 前端友好的标签数组

    class Config:
        from_attributes = True

    @staticmethod
    def parse_tags(tags_str: Optional[str]) -> Optional[List[str]]:
        """将 JSON 字符串解析为列表"""
        if not tags_str:
            return None
        try:
            return json.loads(tags_str)
        except (json.JSONDecodeError, TypeError):
            return None
