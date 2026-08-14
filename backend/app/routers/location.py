"""
位置辅助 API — 混合定位方案
GPS + 手动选择 + 二维码模拟
"""
import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.scenic_spot import ScenicSpot

router = APIRouter(prefix="/api/location", tags=["位置服务"])


class SetCurrentRequest(BaseModel):
    spot_id: str            # 景点编号，如 LS-006
    method: str = "manual"  # gps / manual / qrcode


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) * math.sin(dlng/2)**2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


@router.get("/nearby")
async def nearby_spots(
    spot_id: Optional[str] = Query(None, description="当前景点编号"),
    lat: Optional[float] = Query(None, description="当前纬度"),
    lng: Optional[float] = Query(None, description="当前经度"),
    db: Session = Depends(get_db),
):
    """根据当前位置推荐附近景点"""
    spots = db.query(ScenicSpot).all()

    # 确定当前坐标
    cur_lat, cur_lng = None, None

    if spot_id:
        current = db.query(ScenicSpot).filter(ScenicSpot.spot_id == spot_id).first()
        if current and current.latitude and current.longitude:
            cur_lat, cur_lng = current.latitude, current.longitude

    if cur_lat is None and lat is not None and lng is not None:
        cur_lat, cur_lng = lat, lng

    if cur_lat is None:
        return {"nearby": [], "current_spot": None, "message": "无法确定当前位置，请手动选择"}

    # 计算距离
    nearby = []
    current_spot = None
    for s in spots:
        if s.latitude and s.longitude:
            dist = _haversine(cur_lat, cur_lng, s.latitude, s.longitude)
            item = {
                "spot_id": s.spot_id,
                "spot_name": s.spot_name,
                "distance_m": round(dist),
                "location": s.location or "",
                "opening_info": s.opening_info or "",
            }
            if s.spot_id == spot_id:
                current_spot = item
            elif dist < 500:
                nearby.append(item)

    nearby.sort(key=lambda x: x["distance_m"])

    return {
        "current_spot": current_spot or {"spot_id": spot_id, "spot_name": "当前位置", "distance_m": 0},
        "nearby": nearby[:5],
        "method": "gps" if lat else "spot_id",
    }


@router.post("/set-current")
async def set_current_location(req: SetCurrentRequest, db: Session = Depends(get_db)):
    """设置用户当前位置"""
    spot = db.query(ScenicSpot).filter(ScenicSpot.spot_id == req.spot_id).first()
    if not spot:
        return {"status": "error", "message": "景点不存在"}

    # 找下一站推荐
    next_spots = []
    all_spots = db.query(ScenicSpot).filter(
        ScenicSpot.latitude.isnot(None), ScenicSpot.longitude.isnot(None),
        ScenicSpot.spot_id != req.spot_id
    ).all()

    if spot.latitude and spot.longitude:
        for s in all_spots:
            if s.latitude and s.longitude:
                dist = _haversine(spot.latitude, spot.longitude, s.latitude, s.longitude)
                if dist < 500:
                    next_spots.append({
                        "spot_id": s.spot_id,
                        "spot_name": s.spot_name,
                        "distance_m": round(dist),
                    })
        next_spots.sort(key=lambda x: x["distance_m"])

    # 附近演出提醒
    show_reminders = []
    show_spots = {  # 有演出的景点
        "LS-006": ("九龙灌浴", "10:00/11:30/13:30/15:00"),
        "LS-012": ("灵山吉祥颂", "10:35/11:30/14:00/16:00"),
    }
    for sid, (name, times) in show_spots.items():
        for ns in next_spots[:3]:
            if ns["spot_id"] == sid:
                show_reminders.append(f"{name} 演出时间 {times}")

    return {
        "status": "ok",
        "current_spot": {
            "spot_id": spot.spot_id,
            "spot_name": spot.spot_name,
            "detail_intro": (spot.detail_intro or "")[:200],
            "opening_info": spot.opening_info or "",
            "highlights": spot.highlights or "",
        },
        "next_spot": next_spots[0] if next_spots else None,
        "show_reminders": show_reminders,
        "location_method": req.method,
    }
