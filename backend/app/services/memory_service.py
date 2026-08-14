"""
情感计算 + 长期记忆系统
=======================
零人工标注：从对话历史自动提取游客画像，实现"越聊越懂你"。

核心组件：
1. TouristProfileManager — 游客画像持续更新
2. ConversationMemory  — 短期对话记忆（滑动窗口）
3. EmotionTracker       — 情感追踪与自适应回复策略

答辩要点：不是金鱼记忆的聊天机器人，而是有长期记忆的智能导游
"""
import json, time
from typing import List, Dict, Optional
from collections import defaultdict
from app.core.database import SessionLocal
from app.models.tourist_profile import TouristProfile
from app.models.chat_record import ChatRecord


class TouristProfileManager:
    """游客画像管理 — 零标注，从对话中自动学习"""

    def __init__(self):
        self._profile_cache: Dict[str, dict] = {}  # session_id -> profile

    def get_or_create(self, session_id: str) -> dict:
        """获取或创建游客画像"""
        if session_id in self._profile_cache:
            return self._profile_cache[session_id]

        db = SessionLocal()
        try:
            profile = db.query(TouristProfile).filter(
                TouristProfile.session_id == session_id
            ).first()

            if profile:
                data = {
                    "session_id": session_id,
                    "nickname": profile.nickname or "游客",
                    "interests": json.loads(profile.interests) if profile.interests else [],
                    "visit_duration": profile.visit_duration or "未知",
                    "travel_style": profile.travel_style or "未设置",
                    "age_group": profile.age_group or "未知",
                    "visit_count": 1,
                    "last_active": time.time(),
                }
            else:
                data = {
                    "session_id": session_id,
                    "nickname": "游客",
                    "interests": [],
                    "visit_duration": "未知",
                    "travel_style": "未设置",
                    "age_group": "未知",
                    "visit_count": 1,
                    "last_active": time.time(),
                }
            self._profile_cache[session_id] = data
            return data
        finally:
            db.close()

    def update_from_conversation(self, session_id: str, message: str, answer: str = ""):
        """从对话中自动提取并更新游客画像（零标注）"""
        profile = self.get_or_create(session_id)

        # 兴趣检测：关键词匹配（无标注，规则驱动）
        interest_keywords = {
            "佛教文化": ["佛", "禅", "寺", "经", "菩萨", "法", "梵"],
            "历史古迹": ["历史", "唐代", "宋代", "明代", "古代", "千年", "古刹"],
            "自然风光": ["山", "水", "花", "湖", "森林", "自然", "生态"],
            "拍照打卡": ["拍照", "摄影", "打卡", "合影", "好看", "美"],
            "亲子": ["孩子", "儿童", "小朋友", "亲子", "家庭", "宝宝"],
            "祈福": ["祈福", "许愿", "求签", "平安", "如意", "吉祥", "福"],
            "美食": ["吃", "美食", "素斋", "豆腐", "茶", "餐", "小吃"],
            "演艺": ["表演", "演出", "秀", "灯光", "音乐", "九龙灌浴"],
        }

        for interest, keywords in interest_keywords.items():
            if any(kw in message for kw in keywords):
                if interest not in profile["interests"]:
                    profile["interests"].append(interest)
                    if len(profile["interests"]) > 8:
                        profile["interests"] = profile["interests"][-8:]

        # 出游风格推断
        style_keywords = {
            "深度文化": ["历史", "文化", "讲解", "故事", "了解", "知识"],
            "轻松休闲": ["轻松", "休闲", "散步", "慢慢", "不累", "舒服"],
            "亲子互动": ["孩子", "亲子", "家庭", "小朋友"],
            "拍照打卡": ["拍照", "打卡", "摄影", "好看", "美照", "出片"],
            "祈福朝圣": ["祈福", "许愿", "拜", "烧香", "平安", "愿"],
        }
        max_score = 0
        best_style = profile["travel_style"]
        for style, keywords in style_keywords.items():
            score = sum(1 for kw in keywords if kw in message)
            if score > max_score:
                max_score = score
                best_style = style
        if max_score >= 2:
            profile["travel_style"] = best_style

        # 时长推断
        if any(w in message for w in ["半天", "半日", "4小时", "5小时", "6小时"]):
            profile["visit_duration"] = "半日"
        elif any(w in message for w in ["全天", "一天", "一日", "整天", "8小时"]):
            profile["visit_duration"] = "全天"
        elif any(w in message for w in ["2小时", "3小时", "很快", "短"]):
            profile["visit_duration"] = "2-3小时"

        profile["last_active"] = time.time()
        self._save_to_db(session_id, profile)

    def _save_to_db(self, session_id: str, profile: dict):
        """持久化到数据库"""
        db = SessionLocal()
        try:
            tp = db.query(TouristProfile).filter(
                TouristProfile.session_id == session_id
            ).first()
            if tp:
                tp.interests = json.dumps(profile["interests"], ensure_ascii=False)
                tp.travel_style = profile["travel_style"]
                tp.visit_duration = profile["visit_duration"]
            else:
                tp = TouristProfile(
                    session_id=session_id,
                    nickname=profile["nickname"],
                    interests=json.dumps(profile["interests"], ensure_ascii=False),
                    visit_duration=profile["visit_duration"],
                    travel_style=profile["travel_style"],
                    age_group=profile["age_group"],
                )
                db.add(tp)
            db.commit()
        finally:
            db.close()

    def get_profile_summary(self, session_id: str) -> str:
        """生成画像摘要，注入 Agent System Prompt"""
        p = self.get_or_create(session_id)
        parts = [f"游客: {p['nickname']}"]
        if p["interests"]:
            parts.append(f"兴趣: {', '.join(p['interests'][:5])}")
        if p["travel_style"] != "未设置":
            parts.append(f"出行风格: {p['travel_style']}")
        if p["visit_duration"] != "未知":
            parts.append(f"预计时长: {p['visit_duration']}")
        return " | ".join(parts)


class ConversationMemory:
    """短期 + 长期记忆管理"""

    def __init__(self, max_short_term: int = 10, max_long_term: int = 5):
        self.short_term: Dict[str, List[Dict]] = defaultdict(list)    # session -> 最近 N 轮对话
        self.long_term: Dict[str, List[str]] = defaultdict(list)      # session -> 关键信息摘要
        self.max_short = max_short_term
        self.max_long = max_long_term

    def add(self, session_id: str, user_msg: str, ai_answer: str):
        """添加一轮对话"""
        self.short_term[session_id].append({
            "role": "user", "content": user_msg,
        })
        self.short_term[session_id].append({
            "role": "assistant", "content": ai_answer[:500],
        })

        # 滑动窗口
        if len(self.short_term[session_id]) > self.max_short * 2:
            self.short_term[session_id] = self.short_term[session_id][-(self.max_short * 2):]

        # 自动提取关键信息到长期记忆
        self._extract_key_info(session_id, user_msg)

    def _extract_key_info(self, session_id: str, msg: str):
        """自动提取关键信息（零标注，关键词触发）"""
        triggers = {
            "喜欢": "偏好",
            "想要": "需求",
            "带孩子": "亲子",
            "老人": "长辈同行",
            "第一次": "首次游览",
            "以前来过": "回头客",
            "时间紧": "时间紧张",
            "下雨": "天气关注",
            "轮椅": "无障碍需求",
        }
        for keyword, info_type in triggers.items():
            if keyword in msg:
                summary = f"[{info_type}] {msg[:80]}"
                if summary not in self.long_term[session_id]:
                    self.long_term[session_id].append(summary)
                    if len(self.long_term[session_id]) > self.max_long:
                        self.long_term[session_id] = self.long_term[session_id][-self.max_long:]

    def get_context(self, session_id: str) -> List[Dict]:
        """获取对话上下文（给 Agent）"""
        return self.short_term.get(session_id, [])

    def get_long_term_summary(self, session_id: str) -> str:
        """获取长期记忆摘要"""
        items = self.long_term.get(session_id, [])
        if not items:
            return ""
        return "关于这位游客，你记得:\n" + "\n".join(f"- {item}" for item in items)


class EmotionTracker:
    """情感追踪器 — 从对话序列追踪情绪变化"""

    def __init__(self):
        self._history: Dict[str, List[dict]] = defaultdict(list)  # session -> [{emotion, timestamp, message}]

    def track(self, session_id: str, message: str, emotion: str = "neutral"):
        """记录一次情感"""
        self._history[session_id].append({
            "emotion": emotion,
            "timestamp": time.time(),
            "message": message[:100],
        })
        # 保留最近 30 条
        if len(self._history[session_id]) > 30:
            self._history[session_id] = self._history[session_id][-30:]

    def get_trend(self, session_id: str) -> dict:
        """获取情感趋势"""
        history = self._history.get(session_id, [])
        if not history:
            return {"current": "中性", "trend": "stable", "avg_sentiment": 0}

        recent = history[-5:]
        emotion_scores = {"开心": 2, "感激": 1.5, "中性": 0, "疑惑": -0.5, "担忧": -1, "不满": -2, "焦急": -1.5}
        scores = [emotion_scores.get(h["emotion"], 0) for h in recent]
        avg = sum(scores) / len(scores) if scores else 0

        if avg > 0.3:
            trend = "improving"
        elif avg < -0.3:
            trend = "declining"
        else:
            trend = "stable"

        return {
            "current": recent[-1]["emotion"] if recent else "中性",
            "trend": trend,
            "avg_sentiment": round(avg, 2),
            "recent_emotions": [h["emotion"] for h in recent],
        }

    def get_adaptive_strategy(self, session_id: str) -> str:
        """基于情感趋势的自适应回复策略"""
        trend = self.get_trend(session_id)

        strategies = {
            "improving": "游客情绪积极，保持热情活泼风格，可适当延伸推荐",
            "stable": "游客情绪平稳，保持专业友好导览风格",
            "declining": "游客情绪下降，注意共情，简洁直接，避免啰嗦，主动询问是否需要帮助",
        }

        if trend["current"] in ["焦急", "不满"]:
            return "游客当前急切/不满，回复要简洁直接、先解决核心问题，不要长篇大论"
        if trend["current"] == "疑惑":
            return "游客有疑问，用通俗语言耐心解释，避免过于专业"

        return strategies.get(trend["trend"], "正常导览风格")


# 全局单例
profile_manager = TouristProfileManager()
conversation_memory = ConversationMemory()
emotion_tracker = EmotionTracker()
