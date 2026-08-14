"""
数据库连接模块
使用 SQLAlchemy 管理数据库连接，默认使用 SQLite
答辩要点：通过配置切换 SQLite → MySQL，无需修改业务代码
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# 创建数据库引擎
# SQLite 需要 check_same_thread=False 以支持 FastAPI 异步调用
engine = create_engine(
    settings.database_url,
    connect_args=(
        {"check_same_thread": False}
        if "sqlite" in settings.database_url
        else {}
    ),
    echo=settings.debug,
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ORM 基类，所有模型继承自此类
Base = declarative_base()


def get_db():
    """FastAPI 依赖注入：每次请求获取一个数据库会话，请求结束时自动关闭"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
