"""
FAQ 问答条目模型
答辩要点：独立 FAQ 表，支持浏览量统计与状态管理，为 AI 问答提供高质量语料
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class FaqItem(Base):
    __tablename__ = "faq_items"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    question = Column(String(500), nullable=False, comment="问题")
    answer = Column(Text, comment="标准答案")
    category = Column(String(50), default="通用", comment="所属分类")
    views = Column(Integer, default=0, comment="浏览次数")
    status = Column(String(20), default="已发布", comment="状态：已发布/草稿/待完善")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
