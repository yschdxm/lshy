"""
游客画像模型
答辩要点：记录游客偏好，支撑个性化推荐和智能导览
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class TouristProfile(Base):
    __tablename__ = "tourist_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    session_id = Column(String(64), index=True, nullable=False, comment="会话 ID")
    user_id = Column(Integer, index=True, comment="关联 User 表 ID")
    nickname = Column(String(50), comment="昵称")
    interests = Column(Text, comment="兴趣标签 JSON 数组")
    visit_duration = Column(String(20), comment="预计游览时长")
    travel_style = Column(String(50), comment="出行风格：深度文化/轻松休闲/亲子互动/拍照打卡/祈福朝圣")
    age_group = Column(String(20), comment="年龄段")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
