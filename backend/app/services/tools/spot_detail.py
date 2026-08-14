"""
景点详情查询工具
===============
从数据库查询景点的结构化信息，返回精确的字段数据。
"""
import json
from app.core.database import SessionLocal
from app.models.scenic_spot import ScenicSpot


def get_spot_detail(spot_name: str = "", **kwargs) -> dict:
    """
    获取特定景点的详细信息

    Args:
        spot_name: 景点名称，支持模糊匹配。也接受 spot_id (景点ID如LS-001) 和 name

    Returns:
        景点详情字典
    """
    # 参数别名：LLM 可能传 spot_id 而非 spot_name
    lookup_name = spot_name
    if not lookup_name:
        lookup_name = kwargs.get("name", kwargs.get("spot_id", ""))
    db = SessionLocal()
    try:
        # 尝试多种方式匹配：spot_id（如 LS-006）→ 精确名称 → 模糊名称
        spot = db.query(ScenicSpot).filter(
            ScenicSpot.spot_id == lookup_name
        ).first()

        if not spot:
            spot = db.query(ScenicSpot).filter(
                ScenicSpot.spot_name == lookup_name
            ).first()

        if not spot:
            spot = db.query(ScenicSpot).filter(
                ScenicSpot.spot_name.contains(lookup_name)
            ).first()

        if not spot:
            return {"error": f"未找到景点「{lookup_name}」，请确认名称或ID是否正确。可用的景点ID如LS-001~LS-016和NH-001~NH-006。"}

        # 解析 tags
        tags = []
        if spot.tags:
            try:
                tags = json.loads(spot.tags)
            except (json.JSONDecodeError, TypeError):
                pass

        return {
            "spot_name": spot.spot_name,
            "spot_id": spot.spot_id,
            "scenic_area": spot.scenic_area_name,
            "location": spot.location or "暂无",
            "parameters": spot.parameters or "暂无",
            "core_function": spot.core_function or "暂无",
            "cultural_meaning": spot.cultural_meaning or "暂无",
            "detail_intro": (spot.detail_intro or "暂无")[:800],
            "highlights": spot.highlights or "暂无",
            "opening_info": spot.opening_info or "暂无",
            "notes": spot.notes or "暂无",
            "tags": tags,
            "recommended_duration": spot.recommended_duration,
        }
    finally:
        db.close()


def list_all_spots(tag: str = None, **kwargs) -> dict:
    """
    获取所有景点列表，可按标签筛选

    Args:
        tag: 标签筛选（可选），也接受 tags (列表取第一个)

    Returns:
        景点列表
    """
    # 参数别名
    if not tag:
        tags_val = kwargs.get("tags", None)
        if isinstance(tags_val, list) and tags_val:
            tag = tags_val[0]
        elif isinstance(tags_val, str):
            tag = tags_val
    db = SessionLocal()
    try:
        query = db.query(ScenicSpot)
        if tag:
            query = query.filter(ScenicSpot.tags.contains(tag))

        spots = query.order_by(ScenicSpot.sort_order.asc()).all()

        items = []
        for s in spots:
            tags = []
            if s.tags:
                try:
                    tags = json.loads(s.tags)
                except (json.JSONDecodeError, TypeError):
                    pass

            items.append({
                "spot_name": s.spot_name,
                "spot_id": s.spot_id,
                "scenic_area": s.scenic_area_name,
                "tags": tags,
                "highlights": (s.highlights or "")[:200],
                "duration_min": s.recommended_duration,
            })

        return {
            "total": len(items),
            "filter_tag": tag,
            "spots": items,
        }
    finally:
        db.close()
