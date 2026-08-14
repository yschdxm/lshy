"""
审计日志模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    time = Column(DateTime, default=datetime.utcnow, comment="日志时间")
    user = Column(String(100), default="", comment="操作账号")
    type = Column(String(20), default="操作", comment="类型：登录/操作/系统")
    level = Column(String(10), default="信息", comment="级别：信息/警告/错误")
    action = Column(String(500), default="", comment="操作详情")
    ip = Column(String(50), default="—", comment="IP 地址")
