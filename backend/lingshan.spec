# -*- mode: python ; coding: utf-8 -*-
# 灵山慧游 — 单文件 exe 打包配置（内嵌前端静态资源 + 初始数据）
# 用法：cd backend && .venv/Scripts/pyinstaller.exe lingshan.spec --clean --noconfirm
from PyInstaller.utils.hooks import collect_all, collect_submodules

datas = [
    ('../frontend/out', 'static'),   # 前端静态导出产物 → 运行时由 FastAPI 托管
    ('data', 'data_initial'),        # SQLite 库 / chroma 向量库 → 首次运行释放到 exe 同级 data/
]
binaries = []
hiddenimports = []

# ChromaDB：子模块多且有数据文件，整体收集
c_datas, c_binaries, c_hidden = collect_all('chromadb')
datas += c_datas
binaries += c_binaries
hiddenimports += c_hidden

# onnxruntime / tokenizers 被 chromadb 通过 importlib 惰性加载，静态分析扫不到，显式收集
for pkg in ('onnxruntime', 'tokenizers'):
    p_datas, p_binaries, p_hidden = collect_all(pkg)
    datas += p_datas
    binaries += p_binaries
    hiddenimports += p_hidden

# uvicorn 的 protocol/loop/lifespan 实现是运行期按名字 importlib 加载的
hiddenimports += collect_submodules('uvicorn')

# edge-tts / soundfile 等音频依赖
s_datas, s_binaries, s_hidden = collect_all('soundfile')
datas += s_datas
binaries += s_binaries
hiddenimports += s_hidden

# pywebview（桌面窗口）：JS 资产是数据文件，pythonnet(clr) 为 .NET 桥
for pkg in ('webview', 'clr', 'clr_loader', 'pythonnet'):
    try:
        p_datas, p_binaries, p_hidden = collect_all(pkg)
        datas += p_datas
        binaries += p_binaries
        hiddenimports += p_hidden
    except Exception:
        hiddenimports += [pkg]

a = Analysis(
    ['app/main.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['pyi_runtime_hook.py'],
    excludes=[
        # 明确用不到的重型/可选依赖，减小体积
        # 注意：onnxruntime 不能排除 —— chromadb 在 import 时就会实例化 DefaultEmbeddingFunction
        'torch', 'torchaudio', 'tensorflow', 'sentence_transformers',
        'faster_whisper', 'SpeechRecognition',
        'matplotlib', 'tkinter', 'PyQt5', 'PySide6',
    ],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='lingshan',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,   # 无控制台窗口，双击直接弹出桌面应用窗口；日志写入 exe 同级 lingshan.log
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
