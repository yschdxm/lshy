"""
便民服务设施模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from app.core.database import Base


class ServiceFacility(Base):
    __tablename__ = "service_facilities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="设施名称")
    type = Column(String(20), nullable=False, comment="类型：卫生间/餐饮/出口/医务室/游客中心/停车点")
    location = Column(String(200), default="", comment="位置描述")
    features = Column(JSON, default=list, comment="特色功能列表")
    hours = Column(String(50), default="", comment="开放时间")
    status = Column(String(10), default="开放中", comment="状态：开放中/维护中/已关闭")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
