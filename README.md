# 灵山慧游 · AI 数字人导览系统

面向灵山景区的智慧导览项目：AI 问答（RAG / GraphRAG / 多智能体）、数字人讲解、路线规划、AI 明信片、管理后台。

## 目录结构

```
├── backend/    FastAPI + SQLAlchemy + SQLite + ChromaDB（Python 3.10+）
└── frontend/   Next.js 16 + React 19 + Tailwind 4（Node 20+ / pnpm）
```

## 本地开发

```bash
# 后端（端口在 .env 的 HOST/PORT 中配置，默认 127.0.0.1:8000）
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # 填入各 API Key
python -m app.main     # 或 uvicorn app.main:app --reload --port 8000（命令行参数优先）

# 前端（默认端口 3000；改端口用 `pnpm dev -- -p 3001` 或 shell 环境变量 PORT，
#         写在 .env.local 里的 PORT 不会被 Next.js 读取）
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

所有第三方密钥（LLM / TTS / 绘图 / 高德 / 讯飞数字人）只配置在 `backend/.env`，前端不持有任何密钥。前端连后端的地址由 `frontend/.env.local` 的 `NEXT_PUBLIC_API_URL` 控制。

## 生产部署（宝塔面板要点）

1. **后端**：宝塔「Python项目管理器」或 Supervisor 守护
   `uvicorn app.main:app --host 127.0.0.1 --port 8000`
2. **前端**：`pnpm build` 后用 PM2 守护 `pnpm start`（监听 127.0.0.1:3000）
3. **Nginx** 反代：`/api/` → 8000（**必须 `proxy_buffering off`**，Agent 对话是 SSE 流式），`/` → 3000，一键申请 Let's Encrypt SSL
4. **生产 `.env` 必须修改**：
   - `DEBUG=false`（自动关闭 /docs、/redoc、/openapi.json）
   - `JWT_SECRET=<随机长字符串>`
   - `CORS_ORIGINS=https://你的域名`
5. Neo4j 可选：小内存服务器（≤4G）建议不装或用 AuraDB 云端版，仅影响 GraphRAG 增强功能
6. 备份：宝塔计划任务每日打包 `backend/data/lingshan.db` 和 `backend/data/chroma/`
