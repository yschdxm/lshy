"""
游客端 API — 景点浏览、热门推荐
答辩要点：面向游客的轻量接口，支持搜索、标签筛选、热点推荐
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.core.database import get_db
from app.models.scenic_spot import ScenicSpot
from app.models.route import Route

router = APIRouter(prefix="/api/tourist", tags=["游客端"])


def _spot_to_dict(spot: ScenicSpot) -> dict:
    """景点 ORM → 游客端响应字典"""
    tags_list = None
    if spot.tags:
        try:
            tags_list = json.loads(spot.tags)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "id": spot.id,
        "spot_id": spot.spot_id,
        "spot_name": spot.spot_name,
        "scenic_area_name": spot.scenic_area_name,
        "location": spot.location,
        "parameters": spot.parameters,
        "core_function": spot.core_function,
        "cultural_meaning": spot.cultural_meaning,
        "detail_intro": spot.detail_intro,
        "highlights": spot.highlights,
        "opening_info": spot.opening_info,
        "notes": spot.notes,
        "tags": tags_list,
        "recommended_duration": spot.recommended_duration,
        "crowd_level": spot.crowd_level,
        "latitude": spot.latitude,
        "longitude": spot.longitude,
    }


@router.get("/spots")
async def list_spots(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    tag: Optional[str] = Query(None, description="标签筛选"),
    sort: Optional[str] = Query("default", description="排序方式: default/hot/duration"),
    db: Session = Depends(get_db),
):
    """
    游客端景点列表
    支持关键词搜索、标签筛选、多种排序
    """
    query = db.query(ScenicSpot)

    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            ScenicSpot.spot_name.contains(keyword) |
            ScenicSpot.detail_intro.contains(keyword) |
            ScenicSpot.highlights.contains(keyword) |
            ScenicSpot.tags.contains(keyword)
        )

    if tag:
        query = query.filter(ScenicSpot.tags.contains(tag))

    # 排序
    if sort == "hot":
        query = query.order_by(ScenicSpot.sort_order.asc())
    elif sort == "duration":
        query = query.order_by(ScenicSpot.recommended_duration.asc())
    else:
        query = query.order_by(ScenicSpot.sort_order.asc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_spot_to_dict(s) for s in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/spots/hot")
async def hot_spots(
    limit: int = Query(6, ge=1, le=20, description="返回数量"),
    db: Session = Depends(get_db),
):
    """热门景点推荐 — 按 sort_order 排序取前 N 个"""
    spots = (
        db.query(ScenicSpot)
        .order_by(ScenicSpot.sort_order.asc())
        .limit(limit)
        .all()
    )
    return {"items": [_spot_to_dict(s) for s in spots]}


@router.get("/spots/{spot_id}")
async def get_spot_detail(spot_id: int, db: Session = Depends(get_db)):
    """景点详情"""
    spot = db.query(ScenicSpot).filter(ScenicSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    return _spot_to_dict(spot)
