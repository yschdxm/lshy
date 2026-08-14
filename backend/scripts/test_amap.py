"""高德地图 API 验证"""
import sys, urllib.request, urllib.parse, json
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent.parent))

from app.core.config import settings

# Web 服务 Key（从 .env 读取）
KEY = settings.amap_key

# 测试 1: POI 搜索
params = urllib.parse.urlencode({'keywords': '灵山胜境', 'city': '无锡', 'key': KEY})
r = json.loads(urllib.request.urlopen(f'https://restapi.amap.com/v3/place/text?{params}').read())
print(f'[POI搜索] 状态:{r["status"]} 结果:{r.get("count",0)}')
for p in (r.get('pois') or [])[:3]:
    print(f'  {p["name"]} | {p["location"]}')

# 测试 2: 周边搜索（灵山大佛附近 500m 的厕所/餐饮）
loc = '120.100,31.428'  # 灵山胜境坐标
params2 = urllib.parse.urlencode({
    'location': loc, 'radius': 500, 'types': '060000|050000',
    'key': KEY, 'extensions': 'base'
})
r2 = json.loads(urllib.request.urlopen(f'https://restapi.amap.com/v3/place/around?{params2}').read())
print(f'\n[周边搜索] 状态:{r2["status"]} 500m内设施:{r2.get("count",0)}')
for p in (r2.get('pois') or [])[:5]:
    print(f'  {p["name"]} | {p.get("type","")} | {p.get("distance","")}m')

# 测试 3: 步行路径
params3 = urllib.parse.urlencode({
    'origin': '120.099,31.427',
    'destination': '120.101,31.429',
    'key': KEY,
})
r3 = json.loads(urllib.request.urlopen(f'https://restapi.amap.com/v3/direction/walking?{params3}').read())
print(f'\n[步行路径] 状态:{r3["status"]}')
if r3.get('route',{}).get('paths'):
    p = r3['route']['paths'][0]
    print(f'  距离:{p["distance"]}m 时间:{p["duration"]//60}分钟')
