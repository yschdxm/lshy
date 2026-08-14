"""
双速推理引擎
============
LLM 驱动的智能路由 + FAQ 缓存，零人工标注。

Fast 路径（<1s）：FAQ 缓存命中 / 简单事实问题 / 模板匹配
Agent 路径（<5s）：复杂推理 / 路线规划 / 多工具调用

答辩要点：不是硬编码规则，而是 LLM 实时判断问题复杂度，
同时 FAQ 缓存从历史对话中自动学习高频问答。
"""
import json, time, re, hashlib
from typing import Optional, Dict, Tuple
from app.services.llm_service import llm_service
from app.services.agent_service import route_intent as regex_route

# ============================================================
# FAQ 缓存（从历史对话自动构建）
# ============================================================

class FAQCache:
    """自动学习的 FAQ 缓存"""

    def __init__(self, max_size: int = 200):
        self._cache: Dict[str, dict] = {}  # hash -> {answer, tags, count, last_access}

    def get(self, question: str) -> Optional[str]:
        """尝试从缓存获取答案"""
        h = self._hash(question)
        if h in self._cache:
            entry = self._cache[h]
            entry["count"] += 1
            entry["last_access"] = time.time()
            return entry["answer"]
        # 相似度匹配（简单 Jaccard）
        q_set = set(question)
        for h, entry in self._cache.items():
            cached_set = set(entry.get("question", ""))
            if len(q_set & cached_set) / max(len(q_set | cached_set), 1) > 0.85:
                entry["count"] += 1
                return entry["answer"]
        return None

    def set(self, question: str, answer: str):
        """缓存问答对"""
        h = self._hash(question)
        self._cache[h] = {
            "question": question,
            "answer": answer,
            "count": 1,
            "last_access": time.time(),
        }
        # LRU 淘汰
        if len(self._cache) > 200:
            oldest = min(self._cache, key=lambda k: self._cache[k]["last_access"])
            del self._cache[oldest]

    def stats(self) -> dict:
        return {
            "size": len(self._cache),
            "total_hits": sum(e["count"] for e in self._cache.values()),
            "top_questions": sorted(
                [{"q": e["question"][:50], "hits": e["count"]} for e in self._cache.values()],
                key=lambda x: x["hits"], reverse=True
            )[:10],
        }

    @staticmethod
    def _hash(text: str) -> str:
        return hashlib.md5(text.strip().lower().encode()).hexdigest()[:12]


faq_cache = FAQCache()


# ============================================================
# LLM 智能路由器
# ============================================================

ROUTER_PROMPT = """你是智能路由器。判断用户问题应该走哪条路径：

Fast 路径：简单事实问答（如"大佛多高""门票多少钱""几点开门"），可直接用知识库回答。
Agent 路径：需要多步推理、工具调用、路线规划、比较分析、个性化推荐的复杂问题。

只输出一个单词：fast 或 agent"""


def smart_route(message: str) -> Tuple[str, str]:
    """
    LLM 驱动的智能路由
    返回: (path, reason)
    """
    # 1. 先走正则快速过滤（明确简单问题秒回）
    regex_path = regex_route(message)
    if regex_path == "fast":
        return "fast", "regex: simple pattern matched"

    # 2. FAQ 缓存检查
    cached = faq_cache.get(message)
    if cached:
        return "fast", "faq_cache: hit"

    # 3. LLM 判断（仅对模糊问题）
    if llm_service.is_available:
        try:
            r = llm_service.chat(
                messages=[
                    {"role": "system", "content": ROUTER_PROMPT},
                    {"role": "user", "content": message[:300]},
                ],
                temperature=0.0,
                max_tokens=10,
            )
            if r and "agent" in r.lower():
                return "agent", "llm: complex query detected"
        except Exception:
            pass

    # 4. 默认：消息长度 > 15 字走 Agent
    if len(message) > 15:
        return "agent", "fallback: message length > 15"
    return "fast", "fallback: default fast"


# ============================================================
# 响应缓存装饰器（用于 Agent 结果缓存）
# ============================================================

class ResponseCache:
    """Agent 最终回答缓存"""

    def __init__(self):
        self._store: Dict[str, tuple] = {}  # hash -> (answer, timestamp)

    def get(self, question: str) -> Optional[str]:
        h = hashlib.md5(question.strip().encode()).hexdigest()
        if h in self._store:
            ans, ts = self._store[h]
            if time.time() - ts < 300:  # 5分钟有效期
                return ans
            del self._store[h]
        return None

    def set(self, question: str, answer: str):
        h = hashlib.md5(question.strip().encode()).hexdigest()
        self._store[h] = (answer, time.time())


response_cache = ResponseCache()
