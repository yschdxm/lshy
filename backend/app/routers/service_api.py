"""
便民服务 API — 高德地图集成
===========================
POST /api/service/nearby      周边设施搜索
POST /api/service/walking     步行路径规划
GET  /api/service/weather     天气
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.amap_service import search_nearby, get_walking_route, get_weather_forecast, LINGSHAN_CENTER

router = APIRouter(prefix="/api/service", tags=["便民服务"])


class NearbyRequest(BaseModel):
    facility_type: str = Field(default="toilet", description="设施类型")
    location: str = Field(default=LINGSHAN_CENTER, description="坐标 lng,lat")
    radius: int = Field(default=1000, ge=100, le=5000, description="搜索半径(米)")


@router.post("/nearby")
async def nearby_facilities(req: NearbyRequest):
    result = search_nearby(req.location, req.facility_type, req.radius)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


class WalkingRequest(BaseModel):
    origin: str = Field(default=LINGSHAN_CENTER)
    destination: str = Field(..., description="目标坐标 lng,lat")


@router.post("/walking")
async def walking_route(req: WalkingRequest):
    result = get_walking_route(req.origin, req.destination)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/weather")
async def service_weather(city: str = "320200"):
    result = get_weather_forecast(city)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/facilities")
async def list_facilities():
    """游客端获取所有开放中的便民设施（从数据库读取）"""
    from app.core.database import SessionLocal
    from app.models.service_facility import ServiceFacility as SF
    db = SessionLocal()
    try:
        items = db.query(SF).filter(SF.status == "开放中").order_by(SF.id).all()
        return {
            "facilities": [
                {"id": s.id, "name": s.name, "type": s.type, "location": s.location,
                 "features": s.features or [], "hours": s.hours}
                for s in items
            ]
        }
    finally:
        db.close()
