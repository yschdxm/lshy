"""并行优化基准测试"""
import sys, time, json, urllib.request

BASE = "http://localhost:8000"

def test(label, msg):
    print(f"\n{'='*50}")
    print(f"[{label}] {msg}")
    print(f"{'='*50}")
    t0 = time.time()
    req = urllib.request.Request(
        f"{BASE}/api/agent/chat",
        data=json.dumps({"session_id":"bench","message":msg}).encode(),
        headers={"Content-Type":"application/json"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=60)
    events = {"think":0,"plan":0,"act":0,"observe":0,"answer":0,"done":0}
    last_data = ""
    for line in resp.read().decode().split("\n"):
        if line.startswith("event: "):
            ev = line[7:].strip()
            events[ev] = events.get(ev, 0) + 1
        if line.startswith("data: "):
            try:
                d = json.loads(line[6:])
                if "total_ms" in d:
                    last_data = f"total_ms={d['total_ms']} tools={d.get('tools_called','?')} iter={d.get('iterations','?')}"
            except: pass
    elapsed = time.time() - t0
    print(f"耗时: {elapsed:.1f}s | {last_data}")
    print(f"事件: think={events['think']} plan={events['plan']} act={events['act']} done={events['done']}")
    return elapsed

# 等待服务器启动
time.sleep(3)

t1 = test("简单事实", "灵山大佛有多高？")
t2 = test("比较分析", "灵山大佛和九龙灌浴各有什么特色？")
t3 = test("综合规划", "推荐3小时亲子路线，顺便看天气")

total = t1+t2+t3
print(f"\n{'='*50}")
print(f"总计: {total:.1f}s | 平均: {total/3:.1f}s")
print(f"{'='*50}")
if total/3 < 5:
    print("✅ 平均延迟 < 5秒 — 满足赛题要求！")
else:
    print(f"⚠️ 平均延迟 {total/3:.1f}s — 仍需优化")
