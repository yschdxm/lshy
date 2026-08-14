"""
知识检索工具 — 封装 RAG 服务
===============
Agent 通过此工具搜索景区知识库，获取：
- 景点介绍、历史文化
- 开放时间、票务信息
- 游览攻略、常见问答
"""
from app.services.rag_service import rag_service


def search_knowledge(query: str, top_k: int = 3) -> str:
    """
    搜索景区知识库

    Args:
        query: 搜索关键词
        top_k: 返回结果数量

    Returns:
        格式化的搜索结果文本
    """
    results = rag_service.search_knowledge(query, top_k=top_k)

    if not results:
        return "未找到相关知识。建议尝试不同的关键词，或询问具体景点名称。"

    lines = []
    for i, item in enumerate(results, 1):
        content = item.get("content", "")[:500]
        title = item.get("title", "未知来源")
        source_type = item.get("type", "知识库")
        score = item.get("score", 0)

        lines.append(f"--- 结果 {i} (相关度: {score:.0%}) ---")
        lines.append(f"来源: {title} [{source_type}]")
        lines.append(f"内容: {content}")
        lines.append("")

    return "\n".join(lines)
