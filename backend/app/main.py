"""
灵山慧游 AI 数字人导览系统 — FastAPI 主入口
答辩要点：CORS 跨域配置、模块化路由注册、启动时自动建表和填充演示数据
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.seed import init_seed_data

# 导入所有模型，确保 SQLAlchemy 能发现它们
import app.models  # noqa: F401

# 导入路由模块
from app.routers import system, spots, knowledge, digital_human, tourist, ai, routes_tourist, feedback, admin_analytics, zen, creative, location, evaluation, agent, media, souvenir, service_api, admin_api, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动：自动建表 + 填充种子数据 + 注册 Agent 工具"""
    Base.metadata.create_all(bind=engine)

    # 种子数据：仅当表为空时填充
    db = SessionLocal()
    try:
        init_seed_data(db)
        from app.routers.auth import seed_admin
        seed_admin(db)
    finally:
        db.close()

    # 注册 Agent 工具
    from app.services.tools import register_all_tools
    register_all_tools()

    yield


# 创建 FastAPI 应用实例（生产环境 DEBUG=false 时关闭 API 文档页）
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="景区导览 AI 数字人系统",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
    lifespan=lifespan,
)

# CORS 跨域配置：开发期 "*"，生产环境在 .env 中配置 CORS_ORIGINS 收紧
_cors_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 注册路由 ----
app.include_router(system.router)
app.include_router(spots.router)
app.include_router(knowledge.router)
app.include_router(digital_human.router)
app.include_router(tourist.router)
app.include_router(ai.router)
app.include_router(routes_tourist.router)
app.include_router(feedback.router)
app.include_router(admin_analytics.router)
app.include_router(zen.router)
app.include_router(creative.router)
app.include_router(location.router)
app.include_router(evaluation.router)
app.include_router(agent.router)
app.include_router(media.router)
app.include_router(souvenir.router)
app.include_router(service_api.router)
app.include_router(admin_api.router)
app.include_router(auth.router)


@app.get("/")
async def root():
    """根路径欢迎信息"""
    return {
        "message": f"欢迎使用{settings.app_name} AI 数字人导览系统",
        "docs": "/docs",
    }


if __name__ == "__main__":
    # 按 .env 中的 HOST/PORT 启动（等价于 uvicorn CLI，命令行参数优先）
    # 用法：python -m app.main
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
