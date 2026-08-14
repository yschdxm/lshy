"""
系统设置模型（key-value 键值对存储）
"""
from sqlalchemy import Column, Integer, String
from app.core.database import Base


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False, comment="设置键")
    value = Column(String(500), default="", comment="设置值")
