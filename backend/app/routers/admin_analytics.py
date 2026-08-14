"""
管理后台数据大屏 + 游客洞察 API
"""
import json
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.chat_record import ChatRecord
from app.models.feedback_report import FeedbackReport
from app.models.scenic_spot import ScenicSpot
from app.models.tourist_profile import TouristProfile
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api/admin", tags=["数据大屏"])


from typing import Optional

@router.get("/dashboard/overview")
async def dashboard_overview(days: Optional[int] = 7, db: Session = Depends(get_db)):
    """工作台首页概览 — KPI 卡片 + 趋势 + 待办"""
    from app.models.knowledge_document import KnowledgeDocument
    from app.models.route import Route
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    period_start = (now - timedelta(days=days)).strftime("%Y-%m-%d")

    today_chats = db.query(ChatRecord).filter(ChatRecord.created_at >= today).count()
    yesterday_chats = db.query(ChatRecord).filter(
        ChatRecord.created_at >= yesterday, ChatRecord.created_at < today
    ).count()
    total_chats = db.query(ChatRecord).count()
    spot_count = db.query(ScenicSpot).count()
    doc_count = db.query(KnowledgeDocument).count()
    route_count = db.query(Route).count()
    feedback_count = db.query(FeedbackReport).count()

    avg_satisfaction = db.query(func.avg(ChatRecord.satisfaction_score)).filter(
        ChatRecord.satisfaction_score != None
    ).scalar() or 0

    # N 天趋势：按天聚合
    trend = []
    for i in range(days - 1, -1, -1):
        d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        cnt = db.query(ChatRecord).filter(
            ChatRecord.created_at >= d, ChatRecord.created_at < d + " 23:59:59"
        ).count()
        label = d[-5:] if days <= 30 else f"{int(d[5:7])}/{int(d[8:10])}"
        trend.append({"date": d[-5:], "chats": cnt})

    # 待办
    pending_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.status == "草稿").count()
    todos = [
        {"key": "docs", "title": f"{pending_docs} 篇文档待处理", "tag": "知识库", "tone": "warn" if pending_docs > 0 else "info"},
        {"key": "feedback", "title": f"{feedback_count} 条反馈待查看", "tag": "反馈", "tone": "info" if feedback_count > 0 else "warn"},
        {"key": "route", "title": f"共 {route_count} 条路线", "tag": "路线", "tone": "info"},
    ]

    # 较昨日变化
    if yesterday_chats > 0:
        pct = round((today_chats - yesterday_chats) / yesterday_chats * 100, 1)
        sign = "+" if pct >= 0 else ""
        visitor_trend = f"较昨日{sign}{pct}%"
    else:
        visitor_trend = "较昨日—"

    # 热门问答（取所选周期内）
    hot = db.query(ChatRecord.user_message, func.count(ChatRecord.id).label("cnt")).filter(
        ChatRecord.created_at >= period_start
    ).group_by(ChatRecord.user_message).order_by(func.count(ChatRecord.id).desc()).limit(5).all()
    hot_qs = [{"question": q[0][:40], "count": q[1]} for q in hot]

    return {
        "stats": [
            {"key": "visitors",    "label": "今日服务人次", "value": today_chats,          "trend": visitor_trend, "icon": "Users",          "tint": "text-blue-500 bg-blue-50"},
            {"key": "qa",          "label": "累计问答",     "value": total_chats,          "trend": f"+{today_chats}", "icon": "MessageSquare", "tint": "text-teal-500 bg-teal-50"},
            {"key": "spots",       "label": "景点总数",     "value": spot_count,           "trend": "已配置", "icon": "Landmark",       "tint": "text-emerald-500 bg-emerald-50"},
            {"key": "docs",        "label": "知识文档",     "value": doc_count,            "trend": f"{pending_docs}待处理", "icon": "FileText", "tint": "text-amber-500 bg-amber-50"},
            {"key": "satisfaction","label": "满意度",       "value": f"{avg_satisfaction:.1f}/5", "trend": "",    "icon": "Heart",   "tint": "text-rose-500 bg-rose-50"},
            {"key": "routes",      "label": "路线方案",     "value": route_count,          "trend": "条",   "icon": "MapPin",          "tint": "text-sky-500 bg-sky-50"},
        ],
        "trend": trend,
        "hot_spots": hot_qs,
        "todos": todos,
    }


@router.get("/dashboard/trends")
async def dashboard_trends(db: Session = Depends(get_db)):
    """近 7 日趋势数据"""
    days = []
    chats_data = []
    visitors_data = []

    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day_start + timedelta(days=1)

        count = db.query(ChatRecord).filter(
            ChatRecord.created_at >= day_start,
            ChatRecord.created_at < day_end,
        ).count()

        days.append(day.strftime("%m/%d"))
        chats_data.append(count)
        # 模拟游客数（问答数的 3-5 倍）
        visitors_data.append(count * random.randint(3, 5) + random.randint(100, 500))

    # 意图分布
    intents = {}
    for row in db.query(ChatRecord.intent, func.count(ChatRecord.id)).group_by(ChatRecord.intent).all():
        if row[0]:
            intents[row[0]] = row[1]

    # 路线排行
    route_usage = {}
    for row in db.query(ChatRecord.intent).filter(ChatRecord.intent == "路线推荐").all():
        route_usage["推荐路线"] = route_usage.get("推荐路线", 0) + 1

    return {
        "days": days,
        "chats": chats_data,
        "visitors": visitors_data,
        "intents": intents,
        "route_usage": route_usage,
    }


@router.get("/analysis/emotions")
async def analysis_emotions(db: Session = Depends(get_db)):
    """情绪分析数据"""
    # 情绪分布
    emotions = {}
    for row in db.query(ChatRecord.emotion, func.count(ChatRecord.id)).group_by(ChatRecord.emotion).all():
        if row[0]:
            emotions[row[0]] = row[1]

    # 满意度分布
    sat_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for row in db.query(ChatRecord.satisfaction_score).filter(
        ChatRecord.satisfaction_score.isnot(None)
    ).all():
        s = int(row[0])
        if 1 <= s <= 5:
            sat_dist[s] += 1

    # 最近负面反馈
    negative = []
    records = db.query(ChatRecord).filter(
        ChatRecord.emotion.in_(["不满", "焦急"])
    ).order_by(ChatRecord.created_at.desc()).limit(10).all()
    for r in records:
        negative.append({
            "message": r.user_message[:60] if r.user_message else "",
            "emotion": r.emotion,
            "time": r.created_at.strftime("%m/%d %H:%M") if r.created_at else "",
        })

    return {
        "emotions": emotions,
        "satisfaction_distribution": sat_dist,
        "negative_samples": negative,
    }


@router.get("/analysis/hot-questions")
async def analysis_hot_questions(db: Session = Depends(get_db)):
    """热门问题聚类"""
    # 意图分布
    intents = {}
    for row in db.query(ChatRecord.intent, func.count(ChatRecord.id)).group_by(ChatRecord.intent).all():
        if row[0]:
            intents[row[0]] = row[1]

    # 热门景点关注度
    spots_rank = []
    spots = db.query(ScenicSpot).order_by(ScenicSpot.sort_order).all()
    for s in spots:
        count = db.query(ChatRecord).filter(
            ChatRecord.related_spots.contains(s.spot_name)
        ).count()
        if count > 0:
            spots_rank.append({"name": s.spot_name, "count": count})

    spots_rank.sort(key=lambda x: x["count"], reverse=True)

    return {
        "intents": intents,
        "spots_rank": spots_rank[:10],
    }


@router.get("/analysis/suggestions")
async def analysis_suggestions(db: Session = Depends(get_db)):
    """AI 自动生成运营建议"""
    # 收集数据
    total_chats = db.query(ChatRecord).count()
    emotion_counts = {}
    for row in db.query(ChatRecord.emotion, func.count(ChatRecord.id)).group_by(ChatRecord.emotion).all():
        if row[0]:
            emotion_counts[row[0]] = row[1]

    intent_counts = {}
    for row in db.query(ChatRecord.intent, func.count(ChatRecord.id)).group_by(ChatRecord.intent).all():
        if row[0]:
            intent_counts[row[0]] = row[1]

    # 收集负面反馈样本
    negative_samples = []
    for r in db.query(ChatRecord).filter(
        ChatRecord.emotion.in_(["不满", "焦急"])
    ).limit(5).all():
        negative_samples.append(r.user_message[:60] if r.user_message else "")

    # 收集 feedback_reports
    feedback_items = []
    reports = db.query(FeedbackReport).order_by(FeedbackReport.created_at.desc()).limit(3).all()
    for rep in reports:
        try:
            items = json.loads(rep.service_suggestions or "[]")
            feedback_items.extend(items[-5:])
        except json.JSONDecodeError:
            pass

    # 构建 LLM 提示词
    data_summary = {
        "总问答数": total_chats,
        "情绪分布": emotion_counts,
        "意图分布": intent_counts,
        "负面反馈样本": negative_samples[:5],
        "游客明确反馈": [
            f.get("content", "") if isinstance(f, dict) else str(f)[:50]
            for f in feedback_items
            if (isinstance(f, dict) and f.get("content")) or (isinstance(f, str) and f)
        ],
    }

    suggestions = []

    # 基于规则的初步建议
    if emotion_counts.get("不满", 0) > 0:
        suggestions.append({
            "priority": "高",
            "category": "服务体验",
            "suggestion": "检测到游客有不满情绪，建议检查高频投诉点并优化对应服务流程。"
        })
    if intent_counts.get("开放时间", 0) > intent_counts.get("路线推荐", 0):
        suggestions.append({
            "priority": "中",
            "category": "信息展示",
            "suggestion": "游客频繁查询开放时间，建议在首页和景区入口突出展示各景点开放时间表。"
        })
    if intent_counts.get("路线推荐", 0) > 5:
        suggestions.append({
            "priority": "中",
            "category": "产品优化",
            "suggestion": "路线推荐需求较多，建议丰富个性化路线选项，增加「轻松游」「深度文化游」等主题路线。"
        })

    suggestions.append({
        "priority": "低",
        "category": "数字人优化",
        "suggestion": "定期更新知识库中演出时间、票价等时效性信息，确保 AI 回答准确。"
    })

    suggestions.append({
        "priority": "中",
        "category": "互动增强",
        "suggestion": "建议在热门景点增加扫码听讲解的指引牌，引导游客使用 AI 数字人导览服务。"
    })

    # AI 润色（如果有 LLM）
    if llm_service.is_available and negative_samples:
        prompt = f"""你是景区运营顾问。基于以下游客反馈数据，生成1条具体的运营改善建议：

情绪分布：{json.dumps(emotion_counts, ensure_ascii=False)}
负面反馈：{'; '.join(negative_samples[:3])}

请输出JSON：{{"priority":"高/中/低", "category":"分类", "suggestion":"具体建议(50字以内)"}}
只输出JSON。"""

        result = llm_service.chat([{"role": "user", "content": prompt}], temperature=0.7, max_tokens=200)
        if result:
            try:
                ai_sug = json.loads(result.strip().lstrip("```json").rstrip("```"))
                suggestions.insert(0, ai_sug)
            except json.JSONDecodeError:
                pass

    return {
        "suggestions": suggestions,
        "data_summary": data_summary,
    }
