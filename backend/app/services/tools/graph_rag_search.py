"""
GraphRAG 检索工具 — Agent 通过此工具进行分层知识检索
===================================================
先搜社区摘要 → 锁定主题区域 → 返回深度关联信息
"""
from app.services.graph_rag_service import graph_rag_service


def search_graph_rag(query: str) -> dict:
    """
    GraphRAG 分层检索：社区摘要 → 社区实体

    与普通 search_knowledge 的区别：
    - 普通搜索返回孤立的文档片段
    - GraphRAG 返回主题化的知识社区，包含关联实体和上下文

    Args:
        query: 自然语言查询

    Returns:
        社区摘要 + 实体 + 关联信息
    """
    return graph_rag_service.search(query, top_k=3)


def get_graph_rag_stats() -> dict:
    """获取 GraphRAG 索引统计"""
    return graph_rag_service.get_stats()
