"""
角色权限模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment="角色名称")
    desc = Column(String(200), default="", comment="角色描述")
    built_in = Column(Boolean, default=False, comment="是否内置角色（内置不可删除）")
    is_active = Column(Boolean, default=True, comment="是否启用")
    perms = Column(JSON, default=dict, comment="权限 JSON：{knowledge:full, qa:edit, ...}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
