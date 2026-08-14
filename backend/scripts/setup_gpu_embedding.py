"""
GPU 本地 Embedding 加速
========================
用本地 GPU 跑 BGE-M3，替代 API 调用，零成本 + 高性能。

安装：pip install sentence-transformers
首次运行会自动下载模型（~2GB），之后加载只需几秒。
"""
import sys, os
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))

def setup():
    """检查并配置本地 Embedding"""
    print("=" * 50)
    print("GPU Local Embedding Setup")
    print("=" * 50)

    # 1. 检查 sentence-transformers
    try:
        from sentence_transformers import SentenceTransformer
        print("[OK] sentence-transformers installed")
    except ImportError:
        print("[ACTION] Installing sentence-transformers...")
        os.system(f"{sys.executable} -m pip install sentence-transformers -q")
        from sentence_transformers import SentenceTransformer
        print("[OK] Installed")

    # 2. 检查 GPU
    import torch
    gpu_available = torch.cuda.is_available()
    if gpu_available:
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_mem / 1024**3
        print(f"[GPU] {gpu_name} | VRAM: {vram:.1f} GB")
    else:
        print("[CPU] No GPU detected, using CPU (slower but still works)")

    # 3. 加载 BGE-M3
    device = "cuda" if gpu_available else "cpu"
    print(f"\n[LOAD] Loading BAAI/bge-m3 on {device}...")
    model = SentenceTransformer("BAAI/bge-m3", device=device)

    # 4. 测试
    print("[TEST] Encoding test text...")
    embeddings = model.encode(["灵山大佛是灵山胜境的标志性景点"], normalize_embeddings=True)
    print(f"[OK] Dimension: {embeddings.shape[1]} | Time: fast")

    # 5. 更新配置
    model_path = os.path.join(os.path.dirname(__file__), "..", "data", "bge-m3-local")
    os.makedirs(model_path, exist_ok=True)
    model.save(model_path)
    print(f"\n[SAVE] Model saved to: {model_path}")

    print("\n" + "=" * 50)
    print("SETUP COMPLETE")
    print("=" * 50)
    print("""
To use local embedding instead of API:

1. In .env, keep the API config as fallback
2. The LLM service will auto-detect the local model
3. No code changes needed - the RAG service already has
   a fallback path when embedding API is unavailable

Recommended: Use local embedding for development + API as backup.
""")

    return model


if __name__ == "__main__":
    setup()
