"""
系统配置模块
使用 pydantic-settings 从 .env 文件和环境变量加载配置
答辩要点：集中管理所有配置，方便切换不同环境和模型
"""
from pathlib import Path
from pydantic_settings import BaseSettings

# 项目根目录（backend/app/core/config.py → backend/）
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """应用配置类，所有配置项都有默认值，可通过 .env 覆盖"""

    # ---- 系统 ----
    app_name: str = "灵山慧游"
    app_version: str = "1.0.0"
    debug: bool = True

    # ---- 安全（生产环境配置）----
    # 允许的跨域来源，逗号分隔，如 "https://example.com"；开发期可用 "*"
    cors_origins: str = "*"
    # 数字人形象照上传目录，留空则默认为 <仓库根目录>/frontend/public/avatars
    upload_dir: str = ""

    # ---- 数据库 ----
    database_url: str = f"sqlite:///{BASE_DIR}/data/lingshan.db"

    # ---- 大模型 (OpenAI 兼容 API / Anthropic) ----
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-3.5-turbo"
    llm_provider: str = "openai"  # openai / anthropic

    # ---- Embedding ----
    embedding_model: str = "bge-m3"
    embedding_api_key: str = ""
    embedding_base_url: str = "https://api.openai.com/v1"

    # ---- ChromaDB ----
    chroma_persist_dir: str = str(BASE_DIR / "data" / "chroma")

    # ---- 语音 ----
    asr_provider: str = "whisper"
    tts_provider: str = "mimo"  # mimo / edge / browser
    tts_api_key: str = ""       # MiMo TTS API Key（可与 LLM 不同）

    # ---- 高德地图 Web 服务 ----
    amap_key: str = ""

    # ---- Neo4j 知识图谱 ----
    neo4j_uri: str = "neo4j://127.0.0.1:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = ""

    # ---- 讯飞数字人（密钥仅存服务端，前端通过签名接口获取临时 URL）----
    xfyun_server_url: str = "wss://avatar.cn-huadong-1.xf-yun.com/v1/interact"
    xfyun_app_id: str = ""
    xfyun_api_key: str = ""
    xfyun_api_secret: str = ""
    xfyun_scene_id: str = ""

    # ---- 图像生成（SiliconFlow，默认可复用 Embedding 的配置）----
    image_api_key: str = ""   # 留空则使用 EMBEDDING_API_KEY
    image_base_url: str = ""  # 留空则使用 EMBEDDING_BASE_URL

    # ---- JWT 认证 ----
    jwt_secret: str = "change-me-in-production"  # 生产环境务必通过 .env 覆盖

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 全局单例，其他模块直接导入使用
settings = Settings()
