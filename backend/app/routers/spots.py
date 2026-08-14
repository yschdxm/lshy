"""
景点管理 CRUD 接口
答辩要点：完整的 RESTful API 设计，含分页、搜索和错误处理
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.core.database import get_db
from app.models.scenic_spot import ScenicSpot
from app.schemas.scenic_spot import ScenicSpotCreate, ScenicSpotUpdate, ScenicSpotResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/spots", tags=["景点管理"])


def _parse_tags(spot: ScenicSpot) -> ScenicSpotResponse:
    """将 ORM 对象转为响应对象，同时解析 tags JSON"""
    data = {
        k: v for k, v in spot.__dict__.items()
        if not k.startswith("_")
    }
    data["tags_list"] = ScenicSpotResponse.parse_tags(spot.tags)
    return ScenicSpotResponse(**data)


@router.get("", response_model=PaginatedResponse[ScenicSpotResponse])
async def list_spots(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    tag: Optional[str] = Query(None, description="标签筛选"),
    db: Session = Depends(get_db),
):
    """获取景点列表，支持分页、关键词搜索、标签筛选"""
    query = db.query(ScenicSpot)

    if keyword:
        query = query.filter(
            ScenicSpot.spot_name.contains(keyword) |
            ScenicSpot.detail_intro.contains(keyword)
        )
    if tag:
        # SQLite 中 tags 是文本，用 LIKE 筛选
        query = query.filter(ScenicSpot.tags.contains(tag))

    total = query.count()
    items = (
        query.order_by(ScenicSpot.sort_order.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        items=[_parse_tags(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{spot_id}", response_model=ScenicSpotResponse)
async def get_spot(spot_id: int, db: Session = Depends(get_db)):
    """获取单个景点详情"""
    spot = db.query(ScenicSpot).filter(ScenicSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    return _parse_tags(spot)


@router.post("", response_model=ScenicSpotResponse, status_code=201)
async def create_spot(data: ScenicSpotCreate, db: Session = Depends(get_db)):
    """创建景点"""
    spot = ScenicSpot(**data.model_dump())
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return _parse_tags(spot)


@router.put("/{spot_id}", response_model=ScenicSpotResponse)
async def update_spot(spot_id: int, data: ScenicSpotUpdate, db: Session = Depends(get_db)):
    """更新景点"""
    spot = db.query(ScenicSpot).filter(ScenicSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(spot, key, value)

    db.commit()
    db.refresh(spot)
    return _parse_tags(spot)


@router.delete("/{spot_id}", status_code=204)
async def delete_spot(spot_id: int, db: Session = Depends(get_db)):
    """删除景点"""
    spot = db.query(ScenicSpot).filter(ScenicSpot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="景点不存在")
    db.delete(spot)
    db.commit()
