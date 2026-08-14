"""
游客反馈分析模型
答辩要点：汇总游客行为与情感数据，支撑景区运营决策
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class FeedbackReport(Base):
    __tablename__ = "feedback_reports"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    report_date = Column(String(20), nullable=False, comment="报告日期")
    total_sessions = Column(Integer, default=0, comment="总会话数")
    hot_questions = Column(Text, comment="热门问题 JSON 数组")
    hot_spots = Column(Text, comment="热门景点 JSON 数组")
    emotion_summary = Column(Text, comment="情感分析摘要 JSON")
    service_suggestions = Column(Text, comment="服务建议 JSON 数组")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
