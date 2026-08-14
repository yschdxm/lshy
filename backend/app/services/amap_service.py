"""
高德地图 Web 服务代理
====================
封装：周边搜索、步行路径、POI 查询
答辩要点：解决赛题"GPS信号难以定位"的加分项
"""
import urllib.request, urllib.parse, json, logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

AMAP_KEY = settings.amap_key
AMAP_BASE = "https://restapi.amap.com/v3"

# 灵山胜境核心坐标
LINGSHAN_CENTER = "120.100925,31.425920"

# 设施类型映射
FACILITY_TYPES = {
    "toilet":    "200300|200301|200302",  # 公共厕所
    "dining":    "050000",                # 餐饮
    "exit":      "150600|150700",         # 出入口
    "medical":   "090000",                 # 医疗
    "center":    "140000|060000",          # 游客中心/风景名胜
    "lost":      "140000",                 # 服务相关
    "accessible":"200304",                 # 无障碍设施
    "parking":   "150900|150901",          # 停车场
}

FACILITY_LABELS = {
    "toilet": "洗手间", "dining": "餐饮", "exit": "出口",
    "medical": "医疗", "center": "游客中心", "lost": "失物招领",
    "accessible": "无障碍", "parking": "停车场",
}


def search_nearby(location: str, facility_type: str, radius: int = 1000) -> dict:
    """搜索周边设施"""
    types = FACILITY_TYPES.get(facility_type, facility_type)
    params = urllib.parse.urlencode({
        "location": location,
        "radius": radius,
        "types": types,
        "key": AMAP_KEY,
        "extensions": "base",
    })
    try:
        url = f"{AMAP_BASE}/place/around?{params}"
        data = json.loads(urllib.request.urlopen(url, timeout=8).read())
        if data.get("status") != "1":
            return {"error": data.get("info", "请求失败"), "facilities": []}
        pois = data.get("pois", [])
        return {
            "facilities": [
                {
                    "name": p.get("name", ""),
                    "type": p.get("type", ""),
                    "location": p.get("location", ""),
                    "address": p.get("address", ""),
                    "distance": p.get("distance", ""),
                    "tel": p.get("tel", ""),
                }
                for p in pois[:8]
            ],
            "count": len(pois),
            "center": location,
        }
    except Exception as e:
        logger.error(f"[Amap] 周边搜索失败: {e}")
        return {"error": str(e), "facilities": []}


def get_walking_route(origin: str, destination: str) -> dict:
    """获取步行路径"""
    params = urllib.parse.urlencode({
        "origin": origin,
        "destination": destination,
        "key": AMAP_KEY,
    })
    try:
        url = f"{AMAP_BASE}/direction/walking?{params}"
        data = json.loads(urllib.request.urlopen(url, timeout=8).read())
        if data.get("status") != "1":
            return {"error": data.get("info", "路径规划失败")}

        path = data["route"]["paths"][0]
        steps = []
        for s in path["steps"][:10]:
            steps.append({"instruction": s.get("instruction", ""), "road": s.get("road", ""), "distance": s.get("distance", "")})

        return {
            "distance": int(path["distance"]),
            "duration": int(path["duration"]) // 60,
            "steps": steps,
        }
    except Exception as e:
        logger.error(f"[Amap] 路径规划失败: {e}")
        return {"error": str(e)}


def get_weather_forecast(city: str = "320200") -> dict:
    """获取天气（高德 Adcode: 320200=无锡）"""
    params = urllib.parse.urlencode({
        "city": city,
        "key": AMAP_KEY,
        "extensions": "base",
    })
    try:
        url = f"{AMAP_BASE}/weather/weatherInfo?{params}"
        data = json.loads(urllib.request.urlopen(url, timeout=8).read())
        if data.get("status") != "1":
            return {"error": "天气获取失败"}
        lives = data.get("lives", [])
        if lives:
            l = lives[0]
            return {"city": l.get("city"), "weather": l.get("weather"), "temperature": l.get("temperature"),
                    "wind": l.get("winddirection"), "humidity": l.get("humidity"), "report_time": l.get("reporttime")}
        return {"error": "无天气数据"}
    except Exception as e:
        return {"error": str(e)}
