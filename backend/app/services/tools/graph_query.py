"""
知识图谱查询工具 — Agent 通过此工具查询 Neo4j 图数据库
====================================================
支持自然语言转 Cypher 查询，返回图遍历结果。
"""
from neo4j import GraphDatabase

from app.core.config import settings

NEO4J_URI = settings.neo4j_uri
NEO4J_AUTH = (settings.neo4j_user, settings.neo4j_password)


def query_knowledge_graph(question: str) -> dict:
    """
    Agent 工具：查询知识图谱

    Args:
        question: 用自然语言描述想从图谱中获取什么，如 "灵山大佛和哪些景点邻近"
                    或 "哪些景点属于唐代建筑"

    Returns:
        查询结果
    """
    driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)
    try:
        with driver.session() as s:
            # 根据问题类型自动选择查询模板
            results = []

            # 邻近查询
            if any(w in question for w in ["邻近", "附近", "周边", "旁边", "相邻", "距离"]):
                # 提取景点名
                results = _query_nearby(s, question)

            # 路线查询
            elif any(w in question for w in ["路线", "游览", "包含", "经过"]):
                results = _query_routes(s, question)

            # 关联查询（朝代、人物、文化）
            elif any(w in question for w in ["朝代", "唐代", "宋代", "明代", "清代", "建于"]):
                results = _query_dynasty(s, question)

            elif any(w in question for w in ["人物", "谁", "设计", "创建", "建造", "作者"]):
                results = _query_person(s, question)

            elif any(w in question for w in ["文化", "内涵", "概念", "佛教", "禅", "艺术"]):
                results = _query_concept(s, question)

            # 标签查询
            elif any(w in question for w in ["亲子", "拍照", "祈福", "自然", "美食", "演艺"]):
                results = _query_tags(s, question)

            # 默认：通用图查询
            else:
                results = _query_general(s, question)

            return {
                "question": question,
                "results": results,
                "count": len(results),
                "query_type": _detect_query_type(question),
            }
    finally:
        driver.close()


def _detect_query_type(q: str) -> str:
    if any(w in q for w in ["邻近", "附近", "周边"]): return "nearby"
    if any(w in q for w in ["路线", "游览"]): return "route"
    if any(w in q for w in ["朝代", "唐代", "宋代"]): return "dynasty"
    if any(w in q for w in ["人物", "谁", "设计"]): return "person"
    if any(w in q for w in ["文化", "佛教", "概念"]): return "concept"
    if any(w in q for w in ["亲子", "拍照", "祈福"]): return "tag"
    return "general"


def _query_nearby(s, q: str) -> list:
    """查询某个景点的邻近景点"""
    # 尝试匹配景点名
    for spot_name in ["灵山大佛", "九龙灌浴", "灵山梵宫", "五印坛城", "祥符禅寺",
                       "灵山大照壁", "五明桥", "佛足坛", "菩提大道", "降魔浮雕",
                       "阿育王柱", "弥勒戏沙图", "佛教文化博物馆", "曼荼罗塔", "无尽意斋"]:
        if spot_name in q:
            r = s.run("""
                MATCH (a:Spot {name: $n})-[rel:NEAR_BY]->(b:Spot)
                RETURN a.name as spot, b.name as nearby, rel.dist_m as distance_meters
                ORDER BY rel.dist_m LIMIT 10
            """, n=spot_name)
            return [{"spot": row["spot"], "nearby": row["nearby"],
                     "distance": row["distance_meters"]} for row in r]

    # 返回整个邻近网络
    r = s.run("""
        MATCH (a:Spot)-[rel:NEAR_BY]->(b:Spot)
        RETURN a.name as a, b.name as b, rel.dist_m as d
        ORDER BY d LIMIT 15
    """)
    return [{"from": row["a"], "to": row["b"], "distance_m": row["d"]} for row in r]


def _query_routes(s, q: str) -> list:
    """查询路线及其包含的景点"""
    r = s.run("""
        MATCH (sp:Spot)-[por:PART_OF_ROUTE]->(r:Route)
        RETURN r.name as route, r.type as type, r.duration_minutes as duration,
               collect({spot: sp.name, order: por.order}) as spots
        ORDER BY r.name
    """)
    results = []
    for row in r:
        spots_sorted = sorted(row["spots"], key=lambda x: x["order"])
        results.append({
            "route": row["route"],
            "type": row["type"],
            "duration_min": row["duration"],
            "spots": [s["spot"] for s in spots_sorted],
            "spot_count": len(spots_sorted),
        })
    return results


def _query_dynasty(s, q: str) -> list:
    """查询某个朝代的景点"""
    r = s.run("""
        MATCH (sp:Spot)-[:BUILT_IN]->(d:Dynasty)
        WHERE d.name CONTAINS $dynasty OR $dynasty IN d.name
        RETURN sp.name as spot, d.name as dynasty
    """, dynasty=q[:10])
    return [{"spot": row["spot"], "dynasty": row["dynasty"]} for row in r] if r.peek() else list(r)


def _query_person(s, q: str) -> list:
    """查询与人物相关的景点"""
    r = s.run("""
        MATCH (sp:Spot)-[rel:CREATED_BY]->(p:Person)
        RETURN sp.name as spot, p.name as person, rel.role as role
    """)
    return [{"spot": row["spot"], "person": row["person"], "role": row["role"]} for row in r]


def _query_concept(s, q: str) -> list:
    """查询与文化概念相关的景点"""
    r = s.run("""
        MATCH (sp:Spot)-[:HAS_MEANING]->(cc:CulturalConcept)
        RETURN sp.name as spot, cc.name as concept, cc.category as category
        LIMIT 20
    """)
    return [{"spot": row["spot"], "concept": row["concept"], "category": row["category"]} for row in r]


def _query_tags(s, q: str) -> list:
    """按标签查询景点"""
    r = s.run("""
        MATCH (sp:Spot)-[:HAS_TAG]->(t:Tag)
        RETURN sp.name as spot, sp.spot_id as spot_id,
               collect(t.name) as tags, sp.highlights as highlights
    """)
    results = []
    for row in r:
        results.append({
            "spot": row["spot"],
            "spot_id": row["spot_id"],
            "tags": row["tags"],
            "highlights": (row["highlights"] or "")[:200],
        })
    return results


def _query_general(s, q: str) -> list:
    """通用查询：按照问题关键词搜索"""
    r = s.run("""
        MATCH (sp:Spot)
        WHERE sp.name CONTAINS $kw OR sp.detail_intro CONTAINS $kw
           OR sp.cultural_meaning CONTAINS $kw OR sp.highlights CONTAINS $kw
        RETURN sp.name as spot, sp.spot_id as spot_id,
               sp.location as location, sp.highlights as highlights
        LIMIT 10
    """, kw=q[:20])
    return [{"spot": row["spot"], "spot_id": row["spot_id"],
             "location": row["location"] or "",
             "highlights": (row["highlights"] or "")[:300]} for row in r]
