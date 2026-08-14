"""
路线推荐请求/响应 Schema
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class RoutePreference(BaseModel):
    """用户游览偏好"""
    duration: str = Field(default="半日", description="游玩时间: 2小时/3小时/半日/1日")
    interests: List[str] = Field(default=[], description="兴趣偏好列表")
    companions: str = Field(default="独自", description="同行人群")
    energy: str = Field(default="普通", description="体力: 轻松/普通/充足")
    want_shows: bool = Field(default=True, description="是否想看演出")
    avoid_crowds: bool = Field(default=False, description="是否避开人流")


class RouteSpotItem(BaseModel):
    """路线中的景点项"""
    order: int
    spot_id: str
    spot_name: str
    stay_minutes: int
    highlight: str = ""       # 一句话记忆点
    key_points: str = ""      # 讲解重点
    photo_tip: str = ""       # 拍照建议


class RouteRecommendResponse(BaseModel):
    """路线推荐响应"""
    route_id: int = 0
    route_name: str = ""
    suitable_for: str = ""
    total_minutes: int = 0
    walking_distance: float = 0.0    # 步行距离（米）
    walking_time: int = 0            # 步行时间（分钟）
    spots: List[RouteSpotItem] = []
    reason: str = ""                    # 为什么适合用户
    show_reminders: List[str] = []      # 演出提醒
    tips: List[str] = []                # 贴心提示
    opening_line: str = ""              # 数字人陪游开场白
    avoid_crowds_tip: str = ""          # 避人流建议
