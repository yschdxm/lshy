"""
RAG 本地知识库服务
================================
核心功能：文档分块 → 向量化 → 检索 → 提示词构建 → 回答生成
答辩要点：ChromaDB 向量检索 + 关键词回退双路径，保证有/无 API 均可演示

架构：
  Path A (有 API) → ChromaDB 向量检索 + LLM 回答
  Path B (无 API) → 关键词匹配 + 模板回答
"""
import json
import time
import re
import logging
from typing import List, Dict, Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.knowledge_document import KnowledgeDocument
from app.models.scenic_spot import ScenicSpot
from app.models.route import Route
from app.services.llm_service import llm_service

# 判断 embedding API 是否真实配置
def _has_embedding_api() -> bool:
    return llm_service._is_valid_key(settings.embedding_api_key)

logger = logging.getLogger(__name__)

# ChromaDB 是可选的，未安装时自动降级
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True

    # chromadb 新版 + posthog 3+ 不兼容：即使 anonymized_telemetry=False，
    # 其遥测客户端仍会调用 posthog.capture(...) 并因签名变化报
    # "capture() takes 1 positional argument but 3 were given"。
    # 这里直接把遥测上报替换为 no-op（本项目不需要匿名统计）。
    try:
        from chromadb.telemetry.product.posthog import Posthog as _ChromaPosthog
        _ChromaPosthog.capture = lambda self, event: None  # type: ignore[method-assign]
    except Exception:
        pass
except ImportError:
    HAS_CHROMADB = False
    logger.warning("ChromaDB 未安装，使用关键词检索")


class RAGService:
    """RAG 知识库检索与回答服务"""

    COLLECTION_NAME = "lingshan_knowledge"

    def __init__(self):
        self._client = None
        if HAS_CHROMADB:
            try:
                self._client = chromadb.PersistentClient(
                    path=settings.chroma_persist_dir,
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
            except Exception as e:
                logger.warning(f"ChromaDB 初始化失败: {e}")

    # ================================================================
    # 1. 向量库重建
    # ================================================================

    def rebuild_vector_store(self) -> Dict:
        """
        从数据库重建整个向量库
        步骤：读取所有景点/文档/路线 → 分块 → 向量化 → 存入 ChromaDB
        """
        db = SessionLocal()
        chunks_count = 0

        try:
            # ---- 收集所有 chunks ----
            all_ids, all_docs, all_metas = [], [], []

            # 景点分块（每个字段作为一个独立 chunk）
            spots = db.query(ScenicSpot).all()
            for spot in spots:
                field_chunks = {
                    "详细介绍": spot.detail_intro,
                    "文化内涵": spot.cultural_meaning,
                    "核心功能": spot.core_function,
                    "游玩亮点": spot.highlights,
                    "开放信息": spot.opening_info,
                    "建筑参数": spot.parameters,
                }
                for field_name, content in field_chunks.items():
                    if content and len(content.strip()) > 10:
                        chunks = self._split_text(content, 400, 40)
                        for ci, chunk in enumerate(chunks):
                            cid = f"spot_{spot.id}_{field_name}_{ci}"
                            all_ids.append(cid)
                            all_docs.append(f"【{spot.spot_name} - {field_name}】\n{chunk}")
                            all_metas.append({
                                "source_type": "spot",
                                "source_id": str(spot.id),
                                "spot_name": spot.spot_name or "",
                                "title": spot.spot_name or "",
                                "category": "景点资料",
                                "field": field_name,
                            })

            # 知识文档分块
            docs = db.query(KnowledgeDocument).all()
            for doc in docs:
                if doc.content and len(doc.content.strip()) > 20:
                    chunks = self._split_text(doc.content, 500, 50)
                    for ci, chunk in enumerate(chunks):
                        cid = f"doc_{doc.id}_{ci}"
                        all_ids.append(cid)
                        all_docs.append(f"【{doc.title}】\n{chunk}")
                        all_metas.append({
                            "source_type": "document",
                            "source_id": str(doc.id),
                            "spot_name": "",
                            "title": doc.title or "",
                            "category": doc.category or "景点资料",
                            "field": "",
                        })

            # 路线分块
            routes = db.query(Route).all()
            for route in routes:
                for field_name in ["route_description", "guide_script", "highlights"]:
                    content = getattr(route, field_name, None)
                    if content and len(content.strip()) > 20:
                        cid = f"route_{route.id}_{field_name}"
                        all_ids.append(cid)
                        all_docs.append(f"【{route.route_name} - 路线信息】\n{content[:800]}")
                        all_metas.append({
                            "source_type": "route",
                            "source_id": str(route.id),
                            "spot_name": "",
                            "title": route.route_name or "",
                            "category": "路线攻略",
                            "field": field_name,
                        })

            chunks_count = len(all_ids)

            # ---- 存入 ChromaDB（如果有） ----
            if self._client and all_docs:
                try:
                    self._client.delete_collection(self.COLLECTION_NAME)
                except Exception:
                    pass

                # 判断是否使用 API embedding
                if _has_embedding_api():
                    embeddings = llm_service.embed(all_docs)
                    if embeddings:
                        collection = self._client.create_collection(name=self.COLLECTION_NAME)
                        batch = 100
                        for i in range(0, len(all_docs), batch):
                            collection.add(
                                ids=all_ids[i:i+batch],
                                documents=all_docs[i:i+batch],
                                metadatas=all_metas[i:i+batch],
                                embeddings=embeddings[i:i+batch],
                            )
                        logger.info(f"ChromaDB 向量库已重建：{chunks_count} chunks（API embedding）")
                        return {"status": "ok", "chunks": chunks_count, "engine": "api"}

                # 回退：使用 ChromaDB 默认 embedding（需 sentence-transformers）
                try:
                    collection = self._client.create_collection(name=self.COLLECTION_NAME)
                    batch = 100
                    for i in range(0, len(all_docs), batch):
                        collection.add(
                            ids=all_ids[i:i+batch],
                            documents=all_docs[i:i+batch],
                            metadatas=all_metas[i:i+batch],
                        )
                    logger.info(f"ChromaDB 向量库已重建：{chunks_count} chunks（本地 embedding）")
                    return {"status": "ok", "chunks": chunks_count, "engine": "local"}
                except Exception as e:
                    logger.warning(f"本地 embedding 不可用: {e}")

            logger.info(f"向量库未启用，仅关键词检索可用。chunks 已准备：{chunks_count}")
            return {"status": "ok", "chunks": chunks_count, "engine": "keyword"}

        except Exception as e:
            logger.error(f"重建向量库失败: {e}")
            return {"status": "error", "error": str(e)}
        finally:
            db.close()

    def add_document(self, title: str, content: str, category: str = "") -> int:
        """增量添加单个文档到向量库，返回添加的 chunk 数"""
        if not self._client or not _has_embedding_api():
            return 0

        chunks = self._split_text(content)
        if not chunks:
            return 0

        try:
            from app.services.llm_service import llm_service
            collection = self._client.get_collection(self.COLLECTION_NAME)
            embeddings = []
            for chunk in chunks:
                emb = llm_service.embed(chunk)
                if emb:
                    embeddings.append(emb)
                else:
                    return 0

            ids = [f"doc_inc_{title}_{i}" for i in range(len(chunks))]
            metadatas = [{"title": title, "category": category, "source": "manual"} for _ in chunks]
            collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
            logger.info(f"增量添加文档「{title}」到向量库：{len(chunks)} chunks")
            return len(chunks)
        except Exception as e:
            logger.error(f"增量添加文档失败: {e}")
            return 0

    # ================================================================
    # 2. 知识检索
    # ================================================================

    def search_knowledge(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        检索相关知识片段
        优先向量检索，不可用时回退关键词匹配
        """
        # ---- Path A: ChromaDB 向量检索 ----
        if self._client and _has_embedding_api():
            try:
                collection = self._client.get_collection(self.COLLECTION_NAME)
                query_embedding = llm_service.embed([query])
                if query_embedding:
                    results = collection.query(
                        query_embeddings=query_embedding,
                        n_results=top_k,
                    )
                    return self._format_results(results, top_k)
            except Exception as e:
                logger.warning(f"向量检索失败，回退关键词: {e}")

        # ---- Path B: 关键词匹配回退 ----
        return self._keyword_search(query, top_k)

    def _format_results(self, chroma_results, top_k: int) -> List[Dict]:
        """格式化 ChromaDB 返回结果"""
        items = []
        if not chroma_results or not chroma_results.get("documents"):
            return items

        docs_list = chroma_results["documents"]
        metas_list = chroma_results.get("metadatas", [])
        dists_list = chroma_results.get("distances", [])

        if docs_list and len(docs_list) > 0:
            for i in range(min(top_k, len(docs_list[0]))):
                doc = docs_list[0][i]
                meta = metas_list[0][i] if metas_list and len(metas_list) > 0 else {}
                dist = dists_list[0][i] if dists_list and len(dists_list) > 0 else 0
                items.append({
                    "content": doc,
                    "source_type": meta.get("source_type", ""),
                    "source_id": meta.get("source_id", ""),
                    "spot_name": meta.get("spot_name", ""),
                    "title": meta.get("title", ""),
                    "category": meta.get("category", ""),
                    "score": round(float(dist), 4) if dist else 0,
                })
        return items

    def _keyword_search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        关键词匹配回退方案
        策略：对中文问题逐字匹配，对景点名称做精确匹配加分
        答辩要点：即使没有 API Key，检索功能仍然可用
        """
        db = SessionLocal()
        try:
            results = []

            # 提取查询中的关键词（单字 + 双字组合）
            chars = list(query)
            keywords = set(chars)
            # 添加双字组合提高准确度
            for i in range(len(chars) - 1):
                keywords.add(chars[i] + chars[i + 1])

            # ---- 搜索景点 ----
            spots = db.query(ScenicSpot).all()
            for spot in spots:
                # 拼接所有文本字段
                text_parts = []
                field_texts = {}
                for fn in ["detail_intro", "cultural_meaning", "core_function",
                           "highlights", "opening_info", "parameters"]:
                    val = getattr(spot, fn, None)
                    if val:
                        text_parts.append(val)
                        field_texts[fn] = val

                full_text = " ".join(text_parts)

                # 计分：景点名称命中大幅加分
                score = 0
                if spot.spot_name and spot.spot_name in query:
                    score += 50
                for kw in keywords:
                    if len(kw) >= 1 and kw in full_text:
                        score += 1

                if score > 0:
                    # 根据查询意图选择最佳匹配字段
                    best_field, best_content = self._pick_best_field(
                        field_texts, keywords, query
                    )

                    field_label = {
                        "detail_intro": "详细介绍",
                        "cultural_meaning": "文化内涵",
                        "core_function": "核心功能",
                        "highlights": "游玩亮点",
                        "opening_info": "开放信息",
                        "parameters": "建筑参数",
                    }.get(best_field, best_field)

                    results.append({
                        "content": f"【{spot.spot_name} - {field_label}】\n{best_content or full_text[:500]}",
                        "source_type": "spot",
                        "source_id": str(spot.id),
                        "spot_name": spot.spot_name or "",
                        "title": spot.spot_name or "",
                        "category": "景点资料",
                        "score": score,
                    })

            # ---- 搜索知识文档 ----
            docs = db.query(KnowledgeDocument).all()
            for doc in docs:
                if not doc.content:
                    continue
                score = 0
                if doc.title and any(kw in doc.title for kw in keywords if len(kw) >= 2):
                    score += 30
                for kw in keywords:
                    if len(kw) >= 1 and kw in doc.content:
                        score += 1
                if score > 0:
                    results.append({
                        "content": f"【{doc.title}】\n{doc.content[:500]}",
                        "source_type": "document",
                        "source_id": str(doc.id),
                        "spot_name": "",
                        "title": doc.title or "",
                        "category": doc.category or "景点资料",
                        "score": score,
                    })

            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]
        finally:
            db.close()

    # ================================================================
    # 3. 提示词构建
    # ================================================================

    def build_prompt(self, query: str, retrieved: List[Dict], mode: str = "qa", emotion: str = "中性") -> list:
        """
        构造大模型提示词（System Prompt + 情绪指令 + 参考资料 + 用户问题）
        答辩要点：情绪驱动的 Prompt 工程，不同情绪不同回答策略
        """
        # 构建参考资料
        context_parts = []
        for i, chunk in enumerate(retrieved):
            src = chunk.get("spot_name") or chunk.get("title") or "灵山胜境知识库"
            context_parts.append(
                f"[参考 {i + 1}] 来源：{src}（{chunk.get('category', '')}）\n"
                f"{chunk['content']}"
            )
        context = "\n\n---\n\n".join(context_parts)

        # 根据模式选择 System Prompt
        system_prompts = {
            "qa": (
                "你是灵山胜境（无锡，5A 级景区）的 AI 数字人导游「灵灵」。\n"
                "你的职责是准确、简洁地回答游客的问题。\n\n"
                "规则：\n"
                "1. 严格基于[参考资料]回答，不要编造\n"
                "2. 如果参考资料中确实没有相关信息，诚实告知\n"
                "3. 事实类问题（时间、高度、价格等）直接给出准确数字\n"
                "4. 回答末尾列出引用的来源\n"
                "5. 回答简洁，控制在 200 字以内"
            ),
            "guide": (
                "你是灵山胜境（无锡，5A 级景区）的 AI 数字人导游「灵灵」。\n"
                "你正在为游客进行景点讲解。\n\n"
                "规则：\n"
                "1. 严格基于[参考资料]讲解，不编造\n"
                "2. 语气亲切自然、有导游感，像在面对面讲解\n"
                "3. 适当使用「您」「咱们」「这边请」等导游用语\n"
                "4. 讲解结尾列出参考来源\n"
                "5. 讲解内容在 300-500 字"
            ),
            "route": (
                "你是灵山胜境（无锡，5A 级景区）的 AI 数字人导游「灵灵」。\n"
                "你正在为游客推荐游览路线。\n\n"
                "规则：\n"
                "1. 严格基于[参考资料]推荐，不编造路线\n"
                "2. 推荐时说明路线特色、适合人群、预计时长\n"
                "3. 语气活泼、有引导性\n"
                "4. 推荐结尾列出参考来源"
            ),
        }

        system_prompt = system_prompts.get(mode, system_prompts["qa"])

        # 注入情绪驱动的风格指令
        if emotion in self.EMOTION_STYLES:
            system_prompt += self.EMOTION_STYLES[emotion]

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": (
                f"参考资料：\n{context}\n\n"
                f"游客问题：{query}\n\n"
                f"请按规则回答。"
            )},
        ]

        return messages

    # ================================================================
    # 4. RAG 回答（主方法）
    # ================================================================

    # 情绪驱动的回答风格指令
    EMOTION_STYLES = {
        "焦急": (
            "\n\n【重要】游客现在很着急，请：\n"
            "1. 直接给解决方案，不要铺垫\n"
            "2. 回答控制在 100 字以内\n"
            "3. 优先给路线/时间/最快方案\n"
            "4. 语气：干练利落，不啰嗦"
        ),
        "疑惑": (
            "\n\n【重要】游客感到困惑，请：\n"
            "1. 把答案拆成 2-3 个清晰步骤\n"
            "2. 用「首先…其次…最后…」结构\n"
            "3. 每个要点后加一句简短解释\n"
            "4. 语气：耐心、细致、像老师在教"
        ),
        "不满": (
            "\n\n【重要】游客有不满情绪，请：\n"
            "1. 第一句先表达理解和安抚（如'抱歉让您感觉不便'）\n"
            "2. 然后给出具体的解决建议\n"
            "3. 最后提供一个额外帮助（如'我也可以帮您…'）\n"
            "4. 语气：诚恳、有同理心"
        ),
        "开心": (
            "\n\n【重要】游客心情很好，请：\n"
            "1. 回应更亲切、活泼\n"
            "2. 可以适当加一句灵山小趣闻或祝福语\n"
            "3. 语气：轻松愉快，像朋友聊天"
        ),
        "感谢": (
            "\n\n【重要】游客在表达感谢，请：\n"
            "1. 先开心地回应感谢\n"
            "2. 再自然地问是否还需要其他帮助\n"
            "3. 语气：温暖、亲切、有礼貌"
        ),
    }

    def answer_with_rag(
        self,
        query: str,
        mode: str = "qa",
        session_id: Optional[str] = None,
    ) -> Dict:
        """
        RAG 回答主流程
        1. 检测情绪 → 2. 检索 → 3. LLM（含情绪指令）或模板回答
        """
        t0 = time.time()

        # Step 0: 先检测情绪
        emotion = self._detect_emotion(query)

        # Step 1: 检索
        retrieved = self.search_knowledge(query, top_k=5)

        # Step 2: 尝试 LLM（加入情绪指令）
        if llm_service.is_available and retrieved:
            messages = self.build_prompt(query, retrieved, mode, emotion)
            llm_answer = llm_service.chat(messages)
            if llm_answer:
                return self._build_response(llm_answer, retrieved, query, t0)

        # Step 3: 模板回答降级（也加入情绪适配）
        return self._template_answer(query, retrieved, mode, t0)

    def _template_answer(
        self,
        query: str,
        retrieved: List[Dict],
        mode: str,
        t0: float,
    ) -> Dict:
        """
        模板回答（LLM 不可用时的降级方案）
        基于检索结果直接生成回答
        答辩要点：即使没有大模型，也能给出有依据的回答
        """
        response_time = int((time.time() - t0) * 1000)
        emotion = self._detect_emotion(query)

        # 负面情绪优先安抚
        if emotion == "不满":
            return {
                "answer": (
                    "非常抱歉给您带来不好的体验！让我帮您解决这个问题。\n\n"
                    "您可以：\n"
                    "1. 告诉我具体遇到了什么困难\n"
                    "2. 我帮您换一种方式重新规划\n"
                    "3. 如需人工帮助，游客中心在景区入口处"
                ),
                "sources": [],
                "intent": "投诉反馈",
                "emotion": emotion,
                "response_time_ms": response_time,
            }

        if emotion == "焦急":
            return {
                "answer": (
                    "明白您很赶时间！\n\n"
                    "最快方案：直奔九龙灌浴（核心演出）→ 灵山大佛（必看）→ 梵宫外观拍照，"
                    "全程约 1.5 小时。入口处有观光车可直接到大佛脚下。"
                ),
                "sources": [],
                "intent": "路线推荐",
                "emotion": emotion,
                "response_time_ms": response_time,
            }

        if not retrieved:
            return {
                "answer": (
                    "抱歉，当前知识库中还没有找到与您问题直接相关的信息。\n\n"
                    "建议您：\n"
                    "1. 尝试换一种方式提问\n"
                    "2. 前往游客中心咨询工作人员\n"
                    "3. 查看景区导览图获取更多信息"
                ),
                "sources": [],
                "intent": self._detect_intent(query),
                "emotion": self._detect_emotion(query),
                "response_time_ms": response_time,
            }

        # 根据检索到的内容合成回答
        top = retrieved[0]
        top_content = top["content"]

        # 提取纯文本（去掉元数据标记）
        clean_content = re.sub(r'【.*?】\n?', '', top_content).strip()

        # 根据模式生成回答
        if mode == "guide":
            answer = (
                f"各位游客您好，我是灵山慧游的 AI 导游灵灵。\n\n"
                f"下面为您介绍——\n\n{clean_content[:500]}"
            )
        elif mode == "route":
            answer = (
                f"为您推荐以下游览路线：\n\n"
                f"{clean_content[:400]}"
            )
        else:
            # QA 模式：直接展示检索结果
            answer = clean_content[:400]

        # 收集来源
        sources = self._collect_sources(retrieved)

        return {
            "answer": answer.strip(),
            "sources": sources,
            "intent": self._detect_intent(query),
            "emotion": self._detect_emotion(query),
            "response_time_ms": response_time,
        }

    def _build_response(self, llm_answer: str, retrieved: List[Dict], query: str, t0: float) -> Dict:
        """构建标准响应格式"""
        return {
            "answer": llm_answer,
            "sources": self._collect_sources(retrieved),
            "intent": self._detect_intent(query),
            "emotion": self._detect_emotion(query),
            "response_time_ms": int((time.time() - t0) * 1000),
        }

    @staticmethod
    def _pick_best_field(
        field_texts: dict, keywords: set, query: str
    ) -> tuple:
        """
        根据查询意图选择最佳匹配字段
        时间相关问题优先选 open_info，参数相关问题优先选 parameters
        """
        # 为不同查询类型定义字段优先级
        time_keywords = ["几点", "时间", "开放", "关门", "表演", "场次", "什么时候", "安排"]
        param_keywords = ["多高", "多大", "多少", "面积", "重量", "参数", "尺寸", "长", "宽", "高"]

        # 确定优先级顺序
        if any(w in query for w in time_keywords):
            priority = ["opening_info", "detail_intro", "core_function",
                       "highlights", "cultural_meaning", "parameters"]
        elif any(w in query for w in param_keywords):
            priority = ["parameters", "detail_intro", "core_function",
                       "highlights", "cultural_meaning", "opening_info"]
        else:
            priority = ["detail_intro", "highlights", "core_function",
                       "cultural_meaning", "parameters", "opening_info"]

        # 按优先级顺序返回第一个有关键词命中的字段
        for fn in priority:
            if fn in field_texts and field_texts[fn]:
                txt = field_texts[fn]
                fs = sum(1 for kw in keywords if len(kw) >= 1 and kw in txt)
                if fs > 0:
                    return fn, txt

        # 兜底：返回第一个有内容的字段
        for fn, txt in field_texts.items():
            if txt:
                return fn, txt
        return "", ""

    def _collect_sources(self, retrieved: List[Dict]) -> List[Dict]:
        """从检索结果中收集去重的来源"""
        sources = []
        seen = set()
        for c in retrieved:
            title = c.get("spot_name") or c.get("title") or ""
            if title and title not in seen:
                seen.add(title)
                sources.append({
                    "title": title,
                    "type": c.get("source_type", ""),
                    "category": c.get("category", ""),
                })
        return sources[:5]

    def _detect_intent(self, query: str) -> str:
        """简单意图识别"""
        if any(w in query for w in ["时间", "几点", "开放", "关门", "什么时候"]):
            return "开放时间"
        if any(w in query for w in ["多高", "多大", "多少", "参数", "面积", "重量"]):
            return "事实查询"
        if any(w in query for w in ["路线", "怎么走", "怎么去", "推荐", "游览"]):
            return "路线推荐"
        if any(w in query for w in ["历史", "故事", "文化", "由来", "背景"]):
            return "文化讲解"
        if any(w in query for w in ["特色", "亮点", "好玩", "值得", "好玩"]):
            return "景点推荐"
        if any(w in query for w in ["投诉", "不满", "问题", "意见", "差", "不好"]):
            return "投诉反馈"
        if any(w in query for w in ["谢谢", "感谢", "太好了", "很棒", "不错"]):
            return "感谢"
        return "通用咨询"

    @staticmethod
    def _detect_emotion(query: str) -> str:
        """情绪识别（按严重程度优先级排序）"""
        # 优先级 1: 不满（投诉类最优先处理）
        if any(w in query for w in ["投诉", "不满", "差劲", "不好", "烂", "坑", "太累", "太远", "受不了", "失望"]):
            return "不满"
        # 优先级 2: 焦急（需要快速响应）
        if any(w in query for w in ["急", "赶时间", "快点", "赶紧", "马上", "立刻", "来不及", "没时间", "快一点"]):
            return "焦急"
        # 优先级 3: 感谢/开心
        if any(w in query for w in ["谢谢", "感谢", "太好了", "很棒", "不错", "喜欢", "赞", "开心"]):
            return "开心"
        # 优先级 4: 疑惑
        if any(w in query for w in ["?", "？", "怎么", "为什么", "什么是", "什么意思", "不懂", "不明白"]):
            return "疑惑"
        return "中性"

    # ================================================================
    # 工具方法
    # ================================================================

    @staticmethod
    def _split_text(text: str, max_len: int = 500, overlap: int = 50) -> List[str]:
        """
        文本分块：按段落优先，超长段落按句子切分
        答辩要点：RAG 检索质量的关键在于合理的分块策略
        """
        text = text.strip()
        if len(text) <= max_len:
            return [text]

        chunks = []
        # 优先按段落切分
        paragraphs = text.split("\n")
        current = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current) + len(para) < max_len:
                current = (current + "\n" + para).strip()
            else:
                if current:
                    chunks.append(current)
                # 如果单段超长，按句子切分
                if len(para) > max_len:
                    sub_chunks = RAGService._split_long_paragraph(para, max_len, overlap)
                    chunks.extend(sub_chunks)
                    current = ""
                else:
                    current = para

        if current:
            chunks.append(current)

        return chunks if chunks else [text[:max_len]]

    @staticmethod
    def _split_long_paragraph(text: str, max_len: int, overlap: int) -> List[str]:
        """超长段落按句号、分号切分"""
        sentences = re.split(r'(?<=[。；！？])', text)
        chunks = []
        current = ""

        for sent in sentences:
            if len(current) + len(sent) < max_len:
                current += sent
            else:
                if current:
                    chunks.append(current)
                # 重叠：保留上一块的末尾
                if chunks and overlap > 0:
                    current = current[-overlap:] if len(current) > overlap else ""
                current += sent

        if current:
            chunks.append(current)

        return chunks if chunks else [text[:max_len]]


# 全局单例
rag_service = RAGService()
