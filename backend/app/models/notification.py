"""
管理员通知模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="通知标题")
    subtitle = Column(String(200), default="", comment="副标题（来源+时间描述）")
    is_read = Column(Boolean, default=False, comment="是否已读")
    link = Column(String(100), default="", comment="点击跳转链接")
    created_at = Column(DateTime, default=datetime.utcnow)
