"""
推荐路线模型
答辩要点：预设游览路线，支持 AI 推荐和个性化匹配
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    user_id = Column(Integer, index=True, comment="关联用户 ID")
    route_name = Column(String(100), nullable=False, comment="路线名称")
    route_type = Column(String(50), comment="路线类型：一日游/半日游/深度游/夜游")
    duration_minutes = Column(Integer, comment="总时长(分钟)")
    suitable_people = Column(String(200), comment="适合人群")
    route_spots = Column(Text, comment="路线景点 JSON 数组")
    route_description = Column(Text, comment="路线描述")
    guide_script = Column(Text, comment="导览讲解词")
    highlights = Column(Text, comment="路线亮点")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
