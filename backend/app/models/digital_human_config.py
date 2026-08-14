"""
数字人配置模型
答辩要点：灵活配置数字人形象、声音和性格，实现个性化导览
"""
from sqlalchemy import Column, Integer, String, Text, Boolean
from app.core.database import Base


class DigitalHumanConfig(Base):
    __tablename__ = "digital_human_configs"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    name = Column(String(50), nullable=False, comment="数字人名称")
    avatar_style = Column(String(50), comment="形象风格：古风/现代/卡通")
    voice_name = Column(String(50), comment="语音名称标签：舒窈·女声/风屿·男声")
    avatar_id = Column(String(20), comment="讯飞形象ID")
    vcn = Column(String(50), comment="讯飞语音VCN")
    gender = Column(String(10), comment="性别：女/男")
    image_url = Column(String(300), comment="形象照URL")
    scenes = Column(Text, comment="适用场景 JSON 数组")
    clothing_style = Column(String(50), comment="服装风格")
    personality = Column(String(100), comment="性格设定")
    greeting_text = Column(String(300), comment="欢迎语")
    expression_config = Column(Text, comment="表情配置 JSON")
    is_active = Column(Boolean, default=False, comment="是否启用")
