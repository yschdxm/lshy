"""
基于 admin-data.ts 静态数据批量生成账号
调用后端 API 注册，自动写入 账号信息.txt
"""
import requests
import json
import random

API = "http://localhost:8000/api/auth"
INVITE_CODE = "LINGSHAN2025"

# ============================================================
# 1. 管理员账号（admin 已存在，补充另外 5 个）
# ============================================================
ADMINS = [
    {"account": "lijing",    "password": "lijing123",    "name": "李静"},
    {"account": "wangqiang", "password": "wangqiang123", "name": "王强"},
    {"account": "zhaomin",   "password": "zhaomin123",   "name": "赵敏"},
    {"account": "chenxi",    "password": "chenxi123",    "name": "陈曦"},
    {"account": "liuyang",   "password": "liuyang123",   "name": "刘洋"},
]

# ============================================================
# 2. 游客账号 — 模拟真实人口分布
# ============================================================

# 省份 + 手机号段
REGIONS = {
    "江苏": ["1390510", "1380510", "1370510"],
    "上海": ["1390210", "1380210"],
    "浙江": ["1390571", "1380571"],
    "安徽": ["1390551", "1380551"],
    "广东": ["1390200", "1380200"],
    "山东": ["1390531", "1380531"],
    "北京": ["1390100", "1380100"],
    "河南": ["1390371", "1380371"],
    "福建": ["1390591", "1380591"],
    "湖北": ["1390270", "1380270"],
    "四川": ["1390280", "1380280"],
    "湖南": ["1390731"],
}

# 年龄分布权重（从 static 数据推算：18↓ 1240, 18-30 4180, 31-45 3860, 46-60 2260, 60↑ 946）
AGE_GROUPS = (
    ["18岁以下"] * 12 +
    ["18-30岁"]  * 42 +
    ["31-45岁"]  * 39 +
    ["46-60岁"]  * 23 +
    ["60岁以上"] * 9
)

# 性别分布权重（女 55% / 男 45%）
GENDERS = ["女"] * 55 + ["男"] * 45

# 游客昵称模板
NICKNAMES_MALE = [
    "灵山行者", "太湖游客", "禅意人生", "山水之间", "行者无疆",
    "小灵通", "云游客", "江南旅人", "祈福使者", "摄影达人",
]
NICKNAMES_FEMALE = [
    "灵山仙子", "水韵江南", "禅心一片", "花间游客", "云中漫步",
    "小灵仙", "悠悠旅人", "水乡姑娘", "祈福心愿", "拍照达人",
]

# 游客手机尾号池（避免重复）
used_phones = set()


def random_phone(region: str) -> str:
    """基于省份生成唯一手机号"""
    prefixes = REGIONS[region]
    prefix = random.choice(prefixes)
    while True:
        suffix = f"{random.randint(0, 9999):04d}"
        phone = prefix + suffix
        if phone not in used_phones:
            used_phones.add(phone)
            return phone


def register_tourist(phone: str, password: str, nickname: str, gender: str, age: str, region: str):
    """注册游客"""
    resp = requests.post(f"{API}/login-tourist", json={
        "phone": phone,
        "password": password,
        "nickname": nickname,
        "gender": gender,
        "age_group": age,
        "region": region,
    })
    data = resp.json()
    if resp.status_code == 200:
        print(f"  [OK] 游客 {nickname} ({phone}) - {region} {gender} {age}")
    else:
        print(f"  [FAIL] {data.get('detail', resp.text)}")
    return resp.status_code == 200


def register_admin(account: str, password: str, name: str):
    """注册管理员"""
    resp = requests.post(f"{API}/register-admin", json={
        "account": account,
        "password": password,
        "invite_code": INVITE_CODE,
    })
    data = resp.json()
    if resp.status_code == 200:
        print(f"  [OK] 管理员 {name} ({account})")
    else:
        print(f"  [FAIL] {account} 失败: {data.get('detail', resp.text)}")
    return resp.status_code == 200


# ============================================================
# 执行
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  批量生成管理后台静态数据对应的账号")
    print("=" * 60)

    admin_ok = 0
    tourist_ok = 0

    # --- 管理员 ---
    print("\n>>> 注册管理员账号...")
    for a in ADMINS:
        if register_admin(a["account"], a["password"], a["name"]):
            admin_ok += 1

    # --- 游客 ---
    print(f"\n>>> 注册游客账号（目标 ~20 人）...")
    target = 20
    regions_list = list(REGIONS.keys())
    for i in range(target):
        region = regions_list[i % len(regions_list)]  # 轮询省份保证覆盖
        phone = random_phone(region)
        gender = random.choice(GENDERS)
        age = random.choice(AGE_GROUPS)
        if gender == "男":
            nickname = random.choice(NICKNAMES_MALE) + random.choice(["", str(random.randint(1, 99))])
        else:
            nickname = random.choice(NICKNAMES_FEMALE) + random.choice(["", str(random.randint(1, 99))])
        password = f"tour{random.randint(1000, 9999)}"

        if register_tourist(phone, password, nickname, gender, age, region):
            tourist_ok += 1

    # --- 总结 ---
    print(f"\n{'=' * 60}")
    print(f"  完成！管理员 {admin_ok}/5 | 游客 {tourist_ok}/{target}")
    print(f"  账号信息 → D:\\XCWsproject\\软件杯\\账号信息.txt")
    print(f"{'=' * 60}")
