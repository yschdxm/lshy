"""
知识库文档模型
答辩要点：支撑 RAG 知识库，分类管理景区各类资料
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    title = Column(String(300), nullable=False, comment="文档标题")
    category = Column(String(50), default="景点资料", comment="分类：景点资料/历史文化/FAQ/路线攻略/开放时间")
    content = Column(Text, comment="文档内容")
    source_file = Column(String(300), comment="来源文件")
    status = Column(String(20), default="已发布", comment="状态：草稿/已发布/已归档")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
