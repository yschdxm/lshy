"""
灵山慧游 AI 数字人导览系统 — FastAPI 主入口
答辩要点：CORS 跨域配置、模块化路由注册、启动时自动建表和填充演示数据
"""
import shutil
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings, BASE_DIR, STATIC_DIR, INITIAL_DATA_DIR
from app.core.database import engine, Base, SessionLocal
from app.core.seed import init_seed_data

# 导入所有模型，确保 SQLAlchemy 能发现它们
import app.models  # noqa: F401

# 导入路由模块
from app.routers import system, spots, knowledge, digital_human, tourist, ai, routes_tourist, feedback, admin_analytics, zen, creative, location, evaluation, agent, media, souvenir, service_api, admin_api, auth


def _release_initial_data() -> None:
    """冻结版首次运行：把随包携带的初始数据（SQLite 库 / chroma 向量库 / 统计文件）
    释放到 exe 同级 data/，已有文件不覆盖"""
    if INITIAL_DATA_DIR is None or not INITIAL_DATA_DIR.exists():
        return
    target = BASE_DIR / "data"
    target.mkdir(parents=True, exist_ok=True)
    for src in INITIAL_DATA_DIR.rglob("*"):
        if src.is_dir():
            continue
        dst = target / src.relative_to(INITIAL_DATA_DIR)
        if not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动：自动建表 + 填充种子数据 + 注册 Agent 工具"""
    _release_initial_data()

    # 确保数据目录存在（全新部署/CI 环境下 data/ 不会入库，SQLite 不会自动建父目录）
    Path(BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)

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

# ---- 静态资源托管（内嵌前端）----
import os


class ExportStaticFiles(StaticFiles):
    """适配 Next.js output:'export' 的扁平结构：/console → console.html，
    同时兼容目录式 index.html 与精确的静态文件"""

    async def get_response(self, path: str, scope):
        resp = await super().get_response(path, scope)
        if resp.status_code != 404:
            return resp
        cleaned = path.strip("/")
        candidates = [f"{cleaned}.html", f"{cleaned}/index.html"] if cleaned else ["index.html"]
        for cand in candidates:
            full_path, stat_result = self.lookup_path(cand)
            if stat_result and os.path.isfile(full_path):
                return FileResponse(full_path)
        return resp


# /avatars 指向可写上传目录（冻结时首次运行从打包静态目录播种缺失文件）
from app.routers.digital_human import UPLOAD_DIR

_static_avatars = STATIC_DIR / "avatars"
if _static_avatars.is_dir():
    for _f in _static_avatars.iterdir():
        _dst = Path(UPLOAD_DIR) / _f.name
        if _f.is_file() and not _dst.exists():
            shutil.copy2(_f, _dst)
app.mount("/avatars", StaticFiles(directory=UPLOAD_DIR), name="avatars")

# SPA 回退：非 /api 的未知 GET 路径交给前端 404 页
from fastapi.responses import JSONResponse

@app.exception_handler(StarletteHTTPException)
async def spa_fallback(request, exc):
    if exc.status_code == 404 and request.method == "GET" and not request.url.path.startswith("/api"):
        not_found = STATIC_DIR / "404.html"
        if not_found.is_file():
            return FileResponse(not_found, status_code=404)
    return JSONResponse({"detail": getattr(exc, "detail", str(exc))}, status_code=exc.status_code)


# 前端静态文件（output:'export' 产物）挂载在根路径，必须最后注册
if STATIC_DIR.is_dir():
    app.mount("/", ExportStaticFiles(directory=str(STATIC_DIR), html=True), name="static")


# 注意：原根路径 "/" 的欢迎 JSON 已移除 —— 根路径现由 StaticFiles 托管前端首页，
# 系统信息接口见 /api/system/info


def _run_desktop() -> None:
    """桌面窗口模式：后台线程跑 uvicorn，就绪后弹出 WebView2 原生窗口（不开浏览器）。
    关闭窗口即退出整个进程。"""
    import os
    import socket
    import threading
    import time

    host, port = settings.host, settings.port

    def _serve():
        uvicorn.run(app, host=host, port=port, reload=False, log_level="warning")

    threading.Thread(target=_serve, daemon=True).start()

    # 等待服务就绪（冻结版首启要解压，最多等 60 秒）
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                break
        except OSError:
            time.sleep(0.5)

    import webview

    webview.create_window(
        settings.app_name,
        f"http://{host}:{port}",
        width=1440,
        height=900,
        min_size=(1024, 700),
    )
    webview.start()
    os._exit(0)  # 窗口关闭后杀掉后台 uvicorn 线程


if __name__ == "__main__":
    # 按 .env 中的 HOST/PORT 启动（等价于 uvicorn CLI，命令行参数优先）
    # 用法：python -m app.main          → 开发模式（浏览器访问）
    #       python -m app.main --desktop → 桌面窗口模式
    import multiprocessing
    import uvicorn

    multiprocessing.freeze_support()  # PyInstaller 冻结后必需

    if getattr(sys, "frozen", False) or "--desktop" in sys.argv:
        _run_desktop()
    else:
        uvicorn.run(
            "app.main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
        )
