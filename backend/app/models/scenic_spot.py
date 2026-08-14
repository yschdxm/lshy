"""
景点数据模型
答辩要点：完整覆盖景点多维度信息，支持空间坐标和标签分类
"""
from sqlalchemy import Column, Integer, String, Float, Text
from app.core.database import Base


class ScenicSpot(Base):
    __tablename__ = "scenic_spots"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键")
    scenic_area_name = Column(String(100), nullable=False, default="灵山风景名胜区", comment="景区名称")
    spot_id = Column(String(20), unique=True, nullable=False, comment="景点编号，如 LS-001")
    spot_name = Column(String(100), nullable=False, comment="景点名称")
    location = Column(String(200), comment="具体位置")
    parameters = Column(String(200), comment="建筑/景观参数")
    core_function = Column(String(500), comment="核心功能")
    cultural_meaning = Column(Text, comment="文化内涵")
    detail_intro = Column(Text, comment="详细介绍")
    highlights = Column(Text, comment="游玩亮点")
    opening_info = Column(String(300), comment="演艺/开放信息")
    notes = Column(Text, comment="备注")
    tags = Column(Text, comment="标签 JSON 数组，如 ['佛教文化','拍照打卡']")
    recommended_duration = Column(Integer, default=30, comment="建议游玩时长(分钟)")
    crowd_level = Column(String(100), comment="推荐人群")
    latitude = Column(Float, nullable=True, comment="纬度")
    longitude = Column(Float, nullable=True, comment="经度")
    sort_order = Column(Integer, default=0, comment="排序")
