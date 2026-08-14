"""
天气查询工具
===========
通过公开 API 查询实时天气，无 API Key 要求。
使用 wttr.in 免费天气服务。
"""
import httpx


async def check_weather(city: str = "无锡") -> dict:
    """
    查询城市实时天气

    Args:
        city: 城市名称（中文）

    Returns:
        天气信息字典
    """
    try:
        # 使用 wttr.in 免费天气 API
        url = f"https://wttr.in/{city}?format=j1"
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return await _fallback_weather(city)

            data = resp.json()
            current = data.get("current_condition", [{}])[0]

            return {
                "city": city,
                "temperature_c": current.get("temp_C", "N/A"),
                "weather_desc": current.get("weatherDesc", [{}])[0].get("value", "未知"),
                "humidity": current.get("humidity", "N/A"),
                "wind_speed_kmph": current.get("windspeedKmph", "N/A"),
                "feels_like_c": current.get("FeelsLikeC", "N/A"),
                "visibility_km": current.get("visibility", "N/A"),
                "uv_index": current.get("uvIndex", "N/A"),
            }
    except Exception:
        return await _fallback_weather(city)


async def _fallback_weather(city: str) -> dict:
    """天气 API 不可用时的降级方案"""
    # 无锡/江南地区典型天气（6月）
    return {
        "city": city,
        "temperature_c": "28",
        "weather_desc": "多云（模拟数据，天气服务暂不可用）",
        "humidity": "65",
        "wind_speed_kmph": "12",
        "feels_like_c": "30",
        "note": "此为模拟数据。实际出行前请查看天气预报。",
    }
