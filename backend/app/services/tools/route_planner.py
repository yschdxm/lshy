"""
路线推荐工具 — 封装 RouteService
==============================
Agent 通过此工具为游客生成个性化游览路线。
"""
from typing import List, Optional
from app.core.database import SessionLocal
from app.services.route_service import route_service
from app.schemas.route import RoutePreference


def recommend_route(
    duration_hours: float = 4,
    interests: Optional[List[str]] = None,
    companions: str = "朋友",
    energy_level: str = "适中",
    **kwargs,
) -> dict:
    """
    推荐个性化游览路线

    Args:
        duration_hours: 游览时长（小时），也接受 available_time / duration
        interests: 兴趣标签列表，也接受 interest_tags
        companions: 同行人员（家庭/情侣/朋友/独行），也接受 companion_type
        energy_level: 体力水平（轻松/适中/充沛），也接受 energy

    Returns:
        路线推荐结果
    """
    # 参数别名映射（LLM 可能用不同的参数名）
    if "available_time" in kwargs:
        # "3小时" → 3
        t = str(kwargs["available_time"])
        import re
        m = re.search(r'(\d+)', t)
        if m:
            duration_hours = float(m.group(1))
    if "duration" in kwargs:
        duration_hours = float(kwargs["duration"])
    if "interest_tags" in kwargs:
        interests = kwargs["interest_tags"]
    if "companion_type" in kwargs:
        companions = kwargs["companion_type"]
    if "energy" in kwargs:
        energy_level = kwargs["energy"]

    # 处理 interests 可能是字符串的情况
    if isinstance(interests, str):
        interests = [interests]
    if interests is None or len(interests) == 0:
        interests = ["佛教文化"]

    # 时长映射
    duration_map = {
        2: "2小时", 3: "3小时", 4: "半日", 5: "半日",
        6: "1日", 8: "1日",
    }
    duration_key = duration_map.get(int(duration_hours), "半日")

    pref = RoutePreference(
        duration=duration_key,
        interests=interests,
        companions=companions,
        energy=energy_level,
        want_shows=True,
        avoid_crowds=False,
    )

    db = SessionLocal()
    try:
        result = route_service.recommend(pref, db)

        # 格式化为 Agent 易读的结构
        spots_list = []
        for item in (result.spots or []):
            spots_list.append({
                "order": item.order,
                "name": item.spot_name,
                "spot_id": item.spot_id,
                "stay_minutes": item.stay_minutes,
                "highlight": item.highlight,
                "key_points": item.key_points,
                "photo_tip": item.photo_tip,
            })

        return {
            "route_name": result.route_name,
            "suitable_for": result.suitable_for,
            "total_duration_minutes": result.total_minutes,
            "walking_distance_meters": result.walking_distance,
            "walking_time_minutes": result.walking_time,
            "opening_line": result.opening_line,
            "reason": result.reason,
            "spots": spots_list,
            "show_reminders": result.show_reminders,
            "tips": result.tips,
        }
    finally:
        db.close()
