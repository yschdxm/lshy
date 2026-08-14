"""
数字人配置 Pydantic Schema
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class DigitalHumanConfigBase(BaseModel):
    """数字人配置基础字段"""
    name: str = Field(..., min_length=1, description="数字人名称")
    avatar_style: Optional[str] = None
    voice_name: Optional[str] = None
    avatar_id: Optional[str] = None
    vcn: Optional[str] = None
    gender: Optional[str] = None
    image_url: Optional[str] = None
    scenes: Optional[str] = None  # JSON 数组字符串
    clothing_style: Optional[str] = None
    personality: Optional[str] = None
    greeting_text: Optional[str] = None
    expression_config: Optional[str] = None
    is_active: bool = False


class DigitalHumanConfigCreate(DigitalHumanConfigBase):
    """创建数字人配置请求"""
    pass


class DigitalHumanConfigUpdate(BaseModel):
    """更新数字人配置请求"""
    name: Optional[str] = None
    avatar_style: Optional[str] = None
    voice_name: Optional[str] = None
    avatar_id: Optional[str] = None
    vcn: Optional[str] = None
    gender: Optional[str] = None
    image_url: Optional[str] = None
    scenes: Optional[str] = None
    clothing_style: Optional[str] = None
    personality: Optional[str] = None
    greeting_text: Optional[str] = None
    expression_config: Optional[str] = None
    is_active: Optional[bool] = None


class DigitalHumanConfigResponse(DigitalHumanConfigBase):
    """数字人配置响应"""
    id: int

    class Config:
        from_attributes = True
