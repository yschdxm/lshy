"""验证路线参数是否真正影响生成结果"""
import urllib.request, json

tests = [
    ("1h亲子", {"duration":"1小时","interests":["亲子","祈福"],"companions":"家庭","energy":"轻松"}),
    ("1d文化", {"duration":"1日","interests":["佛教文化","历史古迹"],"companions":"情侣","energy":"普通"}),
    ("2h拍照", {"duration":"2小时","interests":["拍照打卡","自然风光"],"companions":"独行","energy":"充沛"}),
]

for label, body in tests:
    req = urllib.request.Request("http://localhost:8000/api/routes/recommend",
        data=json.dumps(body).encode(), headers={"Content-Type":"application/json"}, method="POST")
    d = json.loads(urllib.request.urlopen(req, timeout=15).read())
    spots = [s["spot_name"] for s in d.get("spots",[])]
    print(f"[{label}] {d['route_name']} | {len(spots)}景点 | {d['total_minutes']}min")
    print(f"  景点: {spots}")
    print(f"  理由: {d.get('reason','')[:120]}")
    print()
