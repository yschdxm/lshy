"""
个性化路线推荐 API
POST /api/routes/recommend     — 根据偏好生成路线
GET  /api/routes/{id}          — 获取路线详情
POST /api/routes/{id}/start-guide — 开始数字人陪游
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.core.auth_dep import get_current_user_id
from app.models.route import Route
from app.schemas.route import RoutePreference, RouteRecommendResponse, RouteSpotItem
from app.services.route_service import route_service

router = APIRouter(prefix="/api/routes", tags=["路线推荐"])


@router.post("/recommend", response_model=RouteRecommendResponse)
async def recommend_route(pref: RoutePreference, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """
    个性化路线推荐
    输入用户偏好 → 规则引擎打分 → LLM 润色 → 保存路线 → 返回
    """
    try:
        result = route_service.recommend(pref, db, user_id=user_id if user_id else None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"路线生成失败: {str(e)}")


@router.get("/{route_id}")
async def get_route(route_id: int, db: Session = Depends(get_db)):
    """获取已保存的路线详情"""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")

    spots_raw = route.route_spots or "[]"
    try:
        spots_data = json.loads(spots_raw)
    except json.JSONDecodeError:
        spots_data = []

    return {
        "id": route.id,
        "route_name": route.route_name,
        "route_type": route.route_type,
        "total_minutes": route.duration_minutes,
        "suitable_people": route.suitable_people,
        "spots": spots_data,
        "route_description": route.route_description,
        "guide_script": route.guide_script,
        "highlights": route.highlights,
        "created_at": route.created_at.isoformat() if route.created_at else None,
    }


@router.post("/{route_id}/start-guide")
async def start_guide(route_id: int, db: Session = Depends(get_db)):
    """开始数字人陪游 — 返回开场白和路线信息供前端使用"""
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="路线不存在")

    spots_raw = route.route_spots or "[]"
    try:
        spots = json.loads(spots_raw)
    except json.JSONDecodeError:
        spots = []

    return {
        "route_id": route.id,
        "route_name": route.route_name,
        "opening_line": route.guide_script or f"欢迎来到{route.route_name}！",
        "spots": spots,
        "total_minutes": route.duration_minutes,
    }
