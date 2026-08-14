"""
交互记录模型
答辩要点：记录每次 AI 对话，支撑情感分析和游客行为洞察
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.core.database import Base


class ChatRecord(Base):
    __tablename__ = "chat_records"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    session_id = Column(String(64), index=True, nullable=False, comment="会话 ID")
    user_id = Column(Integer, index=True, comment="关联用户 ID")
    user_message = Column(Text, comment="用户消息")
    answer = Column(Text, comment="AI 回答")
    intent = Column(String(50), comment="意图分类")
    emotion = Column(String(20), comment="情感标签：positive/neutral/negative")
    related_spots = Column(Text, comment="关联景点 JSON 数组")
    response_time_ms = Column(Integer, comment="响应时间(毫秒)")
    satisfaction_score = Column(Float, comment="满意度评分 1-5")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
