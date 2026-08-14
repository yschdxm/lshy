"""
用户模型
支持游客（手机号登录）和管理员（账号密码登录）两种角色
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    tourist = "tourist"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    username = Column(String(100), unique=True, nullable=False, comment="登录名：游客=手机号，管理员=账号")
    password_hash = Column(String(200), nullable=False, comment="bcrypt 密码哈希")
    role = Column(String(20), default="tourist", comment="角色：tourist / admin")
    nickname = Column(String(100), comment="昵称（游客端显示）")
    gender = Column(String(10), comment="性别：男/女/其他")
    age_group = Column(String(20), comment="年龄段：18岁以下/18-30岁/31-45岁/46-60岁/60岁以上")
    region = Column(String(50), comment="所在省份")
    is_active = Column(String(10), default="启用", comment="状态：启用/禁用")
    department = Column(String(50), default="", comment="部门")
    created_at = Column(DateTime, default=datetime.utcnow, comment="注册时间")
    last_login = Column(DateTime, comment="最后登录时间")
