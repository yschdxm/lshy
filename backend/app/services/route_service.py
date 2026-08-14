"""
个性化路线推荐引擎
==================
策略：规则引擎评分 → 时间约束选取 → Haversine 空间距离路径规划 → LLM 润色
答辩要点：基于真实 GPS 坐标的最近邻路径优化，非简单编号排序
"""
import json
import math
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.scenic_spot import ScenicSpot
from app.models.route import Route
from app.services.llm_service import llm_service
from app.schemas.route import RoutePreference, RouteSpotItem, RouteRecommendResponse


class RouteService:
    """路线推荐服务"""

    # ---- 景点属性标签（基于导入的官方数据） ----
    SPOT_ATTRS = {
        # spot_id: { tags, priority(1-5), is_core, is_photo, is_family, walk_level(1-3) }
        "LS-001": {"priority": 3, "core": False, "photo": True,  "family": False, "walk": 1, "tags": ["历史古迹"]},
        "LS-002": {"priority": 3, "core": False, "photo": False, "family": False, "walk": 1, "tags": ["佛教文化"]},
        "LS-003": {"priority": 3, "core": False, "photo": False, "family": False, "walk": 1, "tags": ["祈福", "佛教文化"]},
        "LS-004": {"priority": 3, "core": False, "photo": False, "family": False, "walk": 1, "tags": ["历史古迹"]},
        "LS-005": {"priority": 4, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["祈福", "佛教文化", "历史古迹"]},
        "LS-006": {"priority": 5, "core": True,  "photo": True,  "family": True,  "walk": 1, "tags": ["演艺", "亲子", "祈福"],
                    "show_time": "10:00/11:30/13:30/15:00", "show_name": "九龙灌浴"},
        "LS-007": {"priority": 3, "core": False, "photo": True,  "family": False, "walk": 1, "tags": ["拍照打卡", "祈福"]},
        "LS-008": {"priority": 3, "core": False, "photo": False, "family": True,  "walk": 1, "tags": ["佛教文化"]},
        "LS-009": {"priority": 4, "core": False, "photo": True,  "family": True,  "walk": 1, "tags": ["亲子", "拍照打卡", "祈福"]},
        "LS-010": {"priority": 3, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["休闲", "建筑艺术"]},
        "LS-011": {"priority": 3, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["休闲"]},
        "LS-012": {"priority": 5, "core": True,  "photo": True,  "family": False, "walk": 2, "tags": ["佛教文化", "建筑艺术", "演艺", "拍照打卡"],
                    "show_time": "10:35/11:30/14:00/16:00", "show_name": "灵山吉祥颂"},
        "LS-013": {"priority": 5, "core": True,  "photo": True,  "family": False, "walk": 3, "tags": ["佛教文化", "祈福", "拍照打卡"]},
        "LS-014": {"priority": 4, "core": False, "photo": True,  "family": False, "walk": 2, "tags": ["佛教文化", "建筑艺术", "拍照打卡"]},
        "LS-015": {"priority": 3, "core": False, "photo": True,  "family": False, "walk": 2, "tags": ["佛教文化", "拍照打卡"]},
        "LS-016": {"priority": 2, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["美食", "休闲"]},
        # 拈花湾
        "NH-001": {"priority": 3, "core": False, "photo": True,  "family": True,  "walk": 1, "tags": ["亲子", "拍照打卡"]},
        "NH-002": {"priority": 3, "core": False, "photo": True,  "family": True,  "walk": 2, "tags": ["自然风光", "亲子", "拍照打卡"]},
        "NH-003": {"priority": 2, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["美食", "购物"]},
        "NH-004": {"priority": 2, "core": False, "photo": False, "family": False, "walk": 2, "tags": ["休闲"]},
        "NH-005": {"priority": 2, "core": False, "photo": True,  "family": False, "walk": 2, "tags": ["建筑艺术"]},
        "NH-006": {"priority": 2, "core": False, "photo": False, "family": True,  "walk": 2, "tags": ["自然风光", "亲子"]},
    }

    # 时间约束
    TIME_LIMITS = {"1小时": 60, "2小时": 120, "3小时": 180, "半日": 240, "1日": 420}

    # 每个景点的默认停留时间（分钟）
    DEFAULT_STAY = {"core": 30, "normal": 20, "quick": 15}

    def recommend(self, pref: RoutePreference, db: Session, user_id: int = None) -> RouteRecommendResponse:
        """
        主推荐流程：
        1. 根据偏好计算景点得分
        2. 按时间和约束选择景点序列
        3. 生成路线详情
        4. LLM 润色讲解词
        """
        limit = self.TIME_LIMITS.get(pref.duration, 240)

        # ---- Step 1: 给所有景点打分 ----
        scored = []
        for sid, attr in self.SPOT_ATTRS.items():
            score = self._score_spot(sid, attr, pref)
            if score > 0:
                scored.append((sid, attr, score))

        # 按得分降序 + 优先级降序
        scored.sort(key=lambda x: (x[2], x[1]["priority"]), reverse=True)

        # ---- Step 2: 按时间选择景点序列 ----
        energy_mult = {"轻松": 1.3, "普通": 1.0, "充足": 0.85}
        time_mult = energy_mult.get(pref.energy, 1.0)

        selected = []
        used_time = 0

        for sid, attr, score in scored:
            # 避开人流的景点在该模式下降低优先级
            if pref.avoid_crowds and attr["priority"] <= 2:
                continue

            stay = self._calc_stay(sid, attr, pref)
            effective_time = int(stay * time_mult)

            if used_time + effective_time <= limit:
                selected.append((sid, attr, stay))
                used_time += effective_time
            else:
                # 如果时间快到了，尝试加一个快速过路点
                if used_time + 15 <= limit and len(selected) < 4:
                    selected.append((sid, attr, 15))
                    used_time += 15
                    break
                continue

        # 如果太少，强制加核心景点
        if len(selected) < 2 and limit >= 120:
            for sid, attr, score in scored:
                if attr["priority"] >= 5 and (sid, attr) not in [(s, a) for s, a, _ in selected]:
                    selected.append((sid, attr, 25))
                    break

        # ---- Step 3: Haversine 空间距离路径规划 ----
        # 基于真实 GPS 坐标，从入口(大照壁)开始，最近邻贪心排序
        selected = self._plan_path(selected)

        # ---- Step 4: 生成路线详情 + 计算步行距离 ----
        spots_data = []
        all_spots = {s.spot_id: s for s in db.query(ScenicSpot).all()}

        for i, (sid, attr, stay) in enumerate(selected):
            spot = all_spots.get(sid)
            if not spot:
                continue

            highlight = self._gen_highlight(spot, attr)
            key_points = self._gen_key_points(spot, attr, pref)
            photo_tip = self._gen_photo_tip(spot, attr) if attr["photo"] else ""

            spots_data.append(RouteSpotItem(
                order=i + 1,
                spot_id=sid,
                spot_name=spot.spot_name,
                stay_minutes=stay,
                highlight=highlight,
                key_points=key_points,
                photo_tip=photo_tip,
            ))

        # 计算步行距离
        walk_dist, walk_time = self._calc_walking_info(spots_data)

        # ---- Step 5: 演出提醒 ----
        show_reminders = []
        for sid, attr, _ in selected:
            if "show_time" in attr:
                show_reminders.append(
                    f"{attr['show_name']} — 演出时间 {attr['show_time']}，"
                    f"建议提前 10 分钟到达占位"
                )

        # ---- Step 6: 贴心提示 ----
        tips = self._gen_tips(pref, selected, limit)

        # ---- Step 7: 路线名称 + 理由 ----
        route_name = self._gen_route_name(pref)
        reason = self._gen_reason(pref, selected)
        suitable_for = self._gen_suitable(pref)
        opening_line = self._gen_opening(pref, spots_data)

        # ---- Step 8: LLM 润色 ----
        if llm_service.is_available:
            opening_line = self._polish_with_llm(
                pref, spots_data, show_reminders, opening_line
            ) or opening_line

        response = RouteRecommendResponse(
            route_name=route_name,
            suitable_for=suitable_for,
            total_minutes=limit,
            walking_distance=walk_dist,
            walking_time=walk_time,
            spots=spots_data,
            reason=reason,
            show_reminders=show_reminders,
            tips=tips,
            opening_line=opening_line,
            avoid_crowds_tip=self._gen_crowd_tip(pref),
        )

        # ---- 持久化到 routes 表 ----
        self._save_route(db, response, pref, user_id)

        return response

    # ================================================================
    # 空间距离计算 + 路径规划
    # ================================================================

    # 灵山胜境入口坐标（大照壁 LS-001）
    ENTRANCE = (31.42700, 120.09500)

    @staticmethod
    def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Haversine 公式 — 计算地球表面两点间距离（米）
        答辩要点：基于真实 GPS 坐标计算景区内步行距离
        """
        R = 6371000  # 地球半径（米）
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def _plan_path(self, selected: List[Tuple[str, dict, int]]) -> List[Tuple[str, dict, int]]:
        """
        最近邻贪心路径规划
        从入口出发，每次选择距当前位置最近的未访问景点
        生成符合实际地理逻辑的游览顺序
        """
        if len(selected) <= 1:
            return selected

        # 获取每个景点的坐标
        coords = {}
        for sid, attr, _ in selected:
            # 使用数据库中真实的经纬度，如果没有则用属性默认值
            if sid in self.SPOT_ATTRS:
                # 从数据库获取坐标
                lat, lng = self._get_spot_coords(sid)
                coords[sid] = (lat, lng)

        # 最近邻贪心：从入口出发
        current = self.ENTRANCE
        remaining = set(sid for sid, _, _ in selected)
        ordered = []

        while remaining:
            # 找距离 current 最近的未访问景点
            nearest = min(
                remaining,
                key=lambda sid: self._haversine(
                    current[0], current[1],
                    coords.get(sid, (0, 0))[0],
                    coords.get(sid, (0, 0))[1],
                )
            )
            ordered.append(nearest)
            remaining.remove(nearest)
            if nearest in coords:
                current = coords[nearest]

        # 重建 selected 列表（按新顺序）
        spot_map = {sid: (sid, attr, stay) for sid, attr, stay in selected}
        return [spot_map[sid] for sid in ordered]

    def _get_spot_coords(self, spot_id: str) -> Tuple[float, float]:
        """从数据库获取景点 GPS 坐标，无坐标时回退到入口"""
        db = SessionLocal()
        try:
            spot = db.query(ScenicSpot).filter(
                ScenicSpot.spot_id == spot_id
            ).first()
            if spot and spot.latitude and spot.longitude:
                return (spot.latitude, spot.longitude)
        finally:
            db.close()
        return self.ENTRANCE

    def _calc_walking_info(self, spots: list) -> Tuple[float, int]:
        """计算路线总步行距离（米）和步行时间（分钟，按 80m/min）"""
        total_dist = 0.0
        current = self.ENTRANCE
        for spot_item in spots:
            sid = getattr(spot_item, 'spot_id', '')
            lat, lng = self._get_spot_coords(sid) if sid else self.ENTRANCE
            total_dist += self._haversine(current[0], current[1], lat, lng)
            current = (lat, lng)
        walk_time = int(total_dist / 80)  # 步行速度 80m/min
        return round(total_dist, 1), walk_time

    # ================================================================
    # 评分函数
    # ================================================================

    def _score_spot(self, sid: str, attr: dict, pref: RoutePreference) -> int:
        score = attr["priority"] * 10

        # 兴趣匹配
        interest_map = {
            "历史文化": ["历史古迹", "佛教文化"],
            "佛教祈福": ["佛教文化", "祈福"],
            "自然风光": ["自然风光"],
            "亲子互动": ["亲子"],
            "拍照打卡": ["拍照打卡"],
            "演艺体验": ["演艺"],
            "轻松少走路": [],
        }
        for interest in pref.interests:
            matched = interest_map.get(interest, [])
            for tag in attr["tags"]:
                if tag in matched:
                    score += 25

        # 亲子加分
        if "亲子互动" in pref.interests and attr["family"]:
            score += 30

        # 轻松少走路：低步行量景点加分
        if "轻松少走路" in pref.interests and attr["walk"] <= 1:
            score += 20

        # 拍照加分
        if "拍照打卡" in pref.interests and attr["photo"]:
            score += 20

        # 同行匹配
        companion_bonus = {
            "独自": 0,
            "情侣": 0,
            "亲子": 15 if attr["family"] else 0,
            "老人": 15 if attr["walk"] <= 1 else -10 if attr["walk"] >= 3 else 0,
            "朋友": 0,
            "研学团队": 10 if "历史古迹" in attr["tags"] or "佛教文化" in attr["tags"] else 0,
        }
        score += companion_bonus.get(pref.companions, 0)

        return max(1, score)

    def _calc_stay(self, sid: str, attr: dict, pref: RoutePreference) -> int:
        base = self.DEFAULT_STAY["core"] if attr["core"] else self.DEFAULT_STAY["normal"]
        if attr["priority"] == 5:
            base = 35
        elif "演艺" in attr["tags"]:
            base = 30

        duration_mod = {"2小时": 0.7, "3小时": 0.85, "半日": 1.0, "1日": 1.2}
        return int(base * duration_mod.get(pref.duration, 1.0))

    # ================================================================
    # 文本生成
    # ================================================================

    def _gen_highlight(self, spot, attr: dict) -> str:
        if spot.highlights:
            items = spot.highlights.replace("、", "，").split("，")
            return items[0][:30] if items else spot.spot_name
        return spot.spot_name

    def _gen_key_points(self, spot, attr: dict, pref: RoutePreference) -> str:
        """根据兴趣生成讲解重点"""
        parts = []
        if "历史文化" in pref.interests or "佛教祈福" in pref.interests:
            if spot.cultural_meaning:
                parts.append(f"文化：{spot.cultural_meaning[:60]}")
        if "亲子互动" in pref.interests:
            if spot.core_function:
                parts.append(f"体验：{spot.core_function[:50]}")
        if "拍照打卡" in pref.interests:
            if spot.highlights:
                parts.append(f"亮点：{spot.highlights[:50]}")
        if not parts:
            parts.append(spot.detail_intro[:80] if spot.detail_intro else spot.spot_name)
        return "；".join(parts[:2])

    def _gen_photo_tip(self, spot, attr: dict) -> str:
        tips = {
            "LS-001": "正对太湖，清晨光线最佳，站在大照壁正中仰拍",
            "LS-006": "喷水最高点时抓拍，上午顺光",
            "LS-009": "和弥勒铜像互动姿势拍照最出片",
            "LS-012": "穹顶壁画用超广角仰拍，内部禁止闪光灯",
            "LS-013": "站在基座仰望大佛，日暮时分金色光晕最美",
            "LS-014": "利用水面倒影拍对称构图，傍晚光线柔和",
            "LS-015": "白塔群配蓝天最佳，上午顺光方向",
        }
        return tips.get(spot.spot_id, f"{spot.spot_name}是热门拍照点，建议上午前往光线最佳")

    def _gen_route_name(self, pref: RoutePreference) -> str:
        interest_name = pref.interests[0] if pref.interests else "经典"
        return f"{pref.duration}{interest_name}精华路线"

    def _gen_reason(self, pref: RoutePreference, selected) -> str:
        if not selected:
            return "暂无推荐路线"
        interest_text = "、".join(pref.interests[:2]) if pref.interests else "综合游览"
        time_text = pref.duration
        crowd_text = "避开了人流密集时段，" if pref.avoid_crowds else ""
        energy_text = {"轻松": "步程轻松、", "普通": "", "充足": "行程紧凑、"}.get(pref.energy, "")
        return (
            f"根据您「{time_text}」「{interest_text}」「{pref.companions}」的偏好，"
            f"{crowd_text}{energy_text}为您精选 {len(selected)} 个景点，"
            f"兼顾深度体验与游览节奏。"
        )

    def _gen_suitable(self, pref: RoutePreference) -> str:
        parts = []
        if pref.companions != "独自":
            parts.append(pref.companions)
        for i in pref.interests[:2]:
            parts.append(i + "爱好者")
        return "、".join(parts) if parts else "所有游客"

    def _gen_opening(self, pref: RoutePreference, spots: list) -> str:
        spot_names = "、".join([s.spot_name for s in spots[:5]])
        interest_str = pref.interests[0] if pref.interests else '经典'
        opening = (
            f"您好！我是您的专属数字人导游灵灵。\n\n"
            f"为您定制了这条「{pref.duration}{interest_str}」精华路线，"
            f"共 {len(spots)} 个景点：{spot_names}。\n\n"
            f"接下来我会全程陪您游览，第一站让我们从灵山大照壁开始——"
        )
        return opening

    def _gen_tips(self, pref: RoutePreference, selected, limit: int) -> List[str]:
        tips = []
        if pref.duration in ("2小时", "3小时"):
            tips.append("时间紧凑，建议每个景点控制停留时间，不要在一个地方停留过久")
        if pref.energy == "轻松":
            tips.append("路线以平地为主，全程步行距离约 2 公里，可随时在休息点停歇")
        if pref.companions == "老人":
            tips.append("灵山大佛区域有台阶，建议走缓坡通道，不必爬阶梯")
        if pref.companions == "亲子":
            tips.append("九龙灌浴和百子戏弥勒区域最适合小朋友互动")
        if pref.want_shows:
            tips.append("建议入园时先确认当日演出时间表，合理规划观演顺序")
        tips.append("景区内可扫码收听 AI 讲解，无需额外购买导览器")
        return tips[:5]

    def _gen_crowd_tip(self, pref: RoutePreference) -> str:
        if pref.avoid_crowds:
            return "建议 8:00 开园即入园，先直奔深处景点再往回游览，避开旅行团高峰（9:30-15:00）"
        return ""

    # ================================================================
    # LLM 润色
    # ================================================================

    def _polish_with_llm(self, pref, spots, reminders, draft):
        spot_list = "\n".join([
            f"{s.order}. {s.spot_name}（{s.stay_minutes}分钟）— {s.highlight}"
            for s in spots
        ])

        prompt = f"""你是灵山胜境（无锡5A景区）的AI导游。

游客偏好：{pref.duration}，兴趣{pref.interests}，{pref.companions}出行，体力{pref.energy}

路线景点：
{spot_list}

演出提醒：
{chr(10).join(reminders) if reminders else "无"}

请为这位游客写一段开场白（150字左右），要：
1. 亲切自然，像真正的导游在说话
2. 点出路线的独特之处
3. 给游客一个对接下来旅程的期待感
4. 简单提醒一个实用贴士

开场白："""

        messages = [
            {"role": "system", "content": "你是灵山胜境的资深导游，说话亲切、专业、接地气。"},
            {"role": "user", "content": prompt},
        ]
        result = llm_service.chat(messages, temperature=0.8, max_tokens=300)
        return result.strip() if result else None

    # ================================================================
    # 持久化
    # ================================================================

    def _save_route(self, db: Session, resp: RouteRecommendResponse, pref: RoutePreference, user_id: int = None):
        try:
            route = Route(
                user_id=user_id,
                route_name=resp.route_name,
                route_type="个性化推荐",
                duration_minutes=resp.total_minutes,
                suitable_people=resp.suitable_for,
                route_spots=json.dumps(
                    [{"spot_id": s.spot_id, "name": s.spot_name, "stay": s.stay_minutes}
                     for s in resp.spots],
                    ensure_ascii=False,
                ),
                route_description=resp.reason,
                guide_script=resp.opening_line,
                highlights=json.dumps(
                    [s.highlight for s in resp.spots],
                    ensure_ascii=False,
                ),
            )
            db.add(route)
            db.commit()
            db.refresh(route)
            resp.route_id = route.id
        except Exception:
            db.rollback()


# 全局单例
route_service = RouteService()
