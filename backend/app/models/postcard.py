"""
明信片记录模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base


class Postcard(Base):
    __tablename__ = "postcards"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    user_id = Column(Integer, index=True, comment="关联用户 ID")
    title = Column(String(200), comment="明信片标题")
    spot_name = Column(String(100), comment="景点名称")
    style = Column(String(50), comment="风格：国风水墨/清新水彩/复古胶片/梦幻夜景/卡通手绘")
    image_data = Column(Text, comment="图片 base64 或 URL")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
