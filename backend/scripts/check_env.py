"""环境自检：确认虚拟环境依赖完整"""
import sys

print(f"Python: {sys.executable}")
assert ".venv" in sys.executable or "venv" in sys.executable, "⚠️ 当前不在虚拟环境中！"

missing = []
for pkg in ["fastapi", "chromadb", "sqlalchemy", "openai", "anthropic", "httpx",
            "bcrypt", "jwt", "neo4j", "networkx", "edge_tts", "soundfile",
            "numpy", "docx", "pptx", "openpyxl", "pandas"]:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)

if missing:
    print(f"❌ 缺失依赖: {missing}")
    sys.exit(1)
print("✅ 全部依赖可导入")

from app.main import app  # noqa: E402
print(f"✅ FastAPI 应用加载成功（{len(app.routes)} 条路由）")
