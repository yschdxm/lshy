"""
知识图谱自动构建脚本
零人工标注：从结构化数据 + LLM 自动抽取 -> Neo4j 知识图谱
"""
import json, sys, re, math
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))

from neo4j import GraphDatabase
from openai import OpenAI
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.scenic_spot import ScenicSpot
from app.models.knowledge_document import KnowledgeDocument
from app.models.route import Route

NEO4J_URI = settings.neo4j_uri
NEO4J_AUTH = (settings.neo4j_user, settings.neo4j_password)

LLM_CLIENT = OpenAI(
    api_key=settings.llm_api_key,
    base_url=settings.llm_base_url,
)

def extract_entities_with_llm(text: str, spot_name: str = "") -> dict:
    """LLM 自动抽取实体（零标注）"""
    prompt = f"""你是一个知识图谱实体抽取器。从以下景区介绍中抽取结构化实体。
文本来源：{spot_name}
文本内容：
{text[:1500]}

请提取以下实体（只输出JSON）：
{{
  "people": [{{"name": "人名", "role": "身份", "related_to_spot": "关系"}}],
  "cultural_concepts": [{{"name": "概念名", "category": "佛教/艺术/历史/建筑/民俗"}}],
  "dynasties": [{{"name": "朝代"}}],
  "artifacts": [{{"name": "文物", "description": "描述"}}]
}}
无实体的字段返回空数组。"""
    try:
        r = LLM_CLIENT.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, max_tokens=500, timeout=20,
        )
        raw = r.choices[0].message.content.strip()
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        return json.loads(m.group(0)) if m else {}
    except Exception as e:
        print(f"  [WARN] LLM extraction failed: {e}")
        return {}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def build():
    driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)
    db = SessionLocal()
    try:
        spots = db.query(ScenicSpot).all()
        docs = db.query(KnowledgeDocument).all()
        routes = db.query(Route).all()

        with driver.session() as s:
            # 1. Clear
            s.run("MATCH (n) DETACH DELETE n")
            print("[1/7] Cleared old graph")

            # 2. Areas
            s.run("""
                CREATE (:Area {name: '灵山胜境', type: 'core', desc: '无锡灵山佛教文化景区'})
                CREATE (:Area {name: '拈花湾禅意小镇', type: 'town', desc: '禅意生活体验小镇'})
            """)
            print("[2/7] Created 2 Areas")

            # 3. Spots + Tags
            for spot in spots:
                tags = []
                if spot.tags:
                    try:
                        tags = json.loads(spot.tags)
                    except Exception:
                        pass
                area = "拈花湾禅意小镇" if "NH" in (spot.spot_id or "") else "灵山胜境"
                s.run("""
                    MATCH (a:Area {name: $area})
                    CREATE (s:Spot {
                        spot_id: $sid, name: $name, location: $loc,
                        core_function: $cf, cultural_meaning: $cm,
                        highlights: $hl, detail_intro: $di,
                        latitude: $lat, longitude: $lng,
                        duration: $dur, tags: $tags
                    })
                    CREATE (s)-[:LOCATED_IN]->(a)
                """,
                    sid=spot.spot_id, name=spot.spot_name,
                    loc=spot.location or "", cf=spot.core_function or "",
                    cm=(spot.cultural_meaning or "")[:500],
                    hl=spot.highlights or "", di=(spot.detail_intro or "")[:1000],
                    lat=spot.latitude or 0, lng=spot.longitude or 0,
                    dur=spot.recommended_duration or 30, tags=tags, area=area,
                )
                for tag in tags:
                    s.run("""
                        MERGE (t:Tag {name: $tag})
                        WITH t MATCH (sp:Spot {spot_id: $sid})
                        MERGE (sp)-[:HAS_TAG]->(t)
                    """, tag=tag, sid=spot.spot_id)
            print(f"[3/7] Created {len(spots)} Spots + tag relationships")

            # 4. NEAR_BY (GPS proximity)
            near = 0
            for i, s1 in enumerate(spots):
                if not s1.latitude or not s1.longitude: continue
                for s2 in spots[i+1:]:
                    if not s2.latitude or not s2.longitude: continue
                    d = haversine(s1.latitude, s1.longitude, s2.latitude, s2.longitude)
                    if d < 300:
                        s.run("""
                            MATCH (a:Spot {spot_id: $id1}), (b:Spot {spot_id: $id2})
                            MERGE (a)-[:NEAR_BY {dist_m: $d}]->(b)
                        """, id1=s1.spot_id, id2=s2.spot_id, d=round(d))
                        near += 1
            print(f"[4/7] Created {near} NEAR_BY relations (<300m)")

            # 5. Routes
            rc = 0
            for route in routes:
                try: sids = json.loads(route.route_spots) if route.route_spots else []
                except: continue
                if not sids: continue
                s.run("""
                    MERGE (r:Route {name: $n})
                    SET r.type = $t, r.duration_minutes = $d, r.people = $p
                """, n=route.route_name, t=route.route_type or "", d=route.duration_minutes or 0, p=route.suitable_people or "")
                for idx, sid in enumerate(sids):
                    s.run("""
                        MATCH (r:Route {name: $rn}), (sp:Spot {spot_id: $sid})
                        MERGE (sp)-[:PART_OF_ROUTE {order: $o}]->(r)
                    """, rn=route.route_name, sid=sid, o=idx+1)
                rc += 1
            print(f"[5/7] Created {rc} Routes + route relations")

            # 6. LLM Entity Extraction from documents
            print("[6/7] LLM extracting entities from documents...")
            ps, ds, cs = set(), set(), set()
            for doc in docs:
                if not doc.content or len(doc.content) < 50: continue
                ents = extract_entities_with_llm(doc.content, doc.title)
                if not ents: continue
                for p in ents.get("people", []):
                    n = p.get("name","").strip()
                    if n and n not in ps:
                        ps.add(n)
                        s.run("MERGE (x:Person {name: $n}) SET x.role = $r, x.relation = $rel", n=n, r=p.get("role",""), rel=p.get("related_to_spot",""))
                for d in ents.get("dynasties", []):
                    n = d.get("name","").strip()
                    if n and n not in ds:
                        ds.add(n)
                        s.run("MERGE (:Dynasty {name: $n})", n=n)
                for c in ents.get("cultural_concepts", []):
                    n = c.get("name","").strip()
                    if n and n not in cs:
                        cs.add(n)
                        s.run("MERGE (x:CulturalConcept {name: $n}) SET x.category = $cat", n=n, cat=c.get("category",""))
            print(f"  Entities: {len(ps)} People, {len(ds)} Dynasties, {len(cs)} Concepts")

            # 7. LLM Spot-Entity Relations
            print("[7/7] LLM linking spots to entities...")
            rels = 0
            for spot in spots[:10]:
                text = f"{spot.spot_name}. {spot.cultural_meaning or ''} {spot.detail_intro or ''}"
                if len(text) < 30: continue
                ents = extract_entities_with_llm(text, spot.spot_name)
                if not ents: continue
                for p in ents.get("people", []):
                    n = p.get("name","").strip()
                    if n:
                        s.run("MATCH (sp:Spot {spot_id: $sid}), (p:Person {name: $pn}) MERGE (sp)-[:CREATED_BY {role: $r}]->(p)", sid=spot.spot_id, pn=n, r=p.get("role",""))
                        rels += 1
                for c in ents.get("cultural_concepts", []):
                    n = c.get("name","").strip()
                    if n:
                        s.run("MATCH (sp:Spot {spot_id: $sid}), (cc:CulturalConcept {name: $cn}) MERGE (sp)-[:HAS_MEANING]->(cc)", sid=spot.spot_id, cn=n)
                        rels += 1
                for d in ents.get("dynasties", []):
                    n = d.get("name","").strip()
                    if n:
                        s.run("MATCH (sp:Spot {spot_id: $sid}), (dy:Dynasty {name: $dn}) MERGE (sp)-[:BUILT_IN]->(dy)", sid=spot.spot_id, dn=n)
                        rels += 1
            print(f"  Created {rels} cross-entity relations")

            # Stats
            print("\n" + "="*50)
            print("KNOWLEDGE GRAPH BUILD COMPLETE")
            print("="*50)
            for r in s.run("MATCH (n) RETURN labels(n)[0] as label, count(n) as cnt ORDER BY cnt DESC"):
                print(f"  {r['label']:20s} {r['cnt']}")
            tn = s.run("MATCH (n) RETURN count(n) as c").single()["c"]
            tr = s.run("MATCH ()-[r]->() RETURN count(r) as c").single()["c"]
            print(f"\n  Total: {tn} nodes, {tr} relations")
    finally:
        db.close()
        driver.close()

if __name__ == "__main__":
    build()
