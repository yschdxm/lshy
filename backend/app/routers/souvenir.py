"""
灵山记忆 — AI 游后数字纪念
===========================
创新功能：游览结束后，AI 自动生成个性化数字纪念页
包含：游览路线、知识卡片、AI 游记、虚拟打卡

答辩要点：国内首个将 AI Agent 能力延伸到"游后"阶段的系统
"""
import json, logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.database import get_db
from app.core.auth_dep import get_current_user_id
from app.models.chat_record import ChatRecord
from app.models.tourist_profile import TouristProfile
from app.models.postcard import Postcard
from app.models.user import User
from app.services.llm_service import llm_service
from app.services.memory_service import profile_manager, conversation_memory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/souvenir", tags=["游后纪念"])


class SouvenirRequest(BaseModel):
    session_id: str = Field(..., description="会话ID")


class SouvenirResponse(BaseModel):
    title: str
    date: str
    visitor_name: str
    journey_summary: str           # AI 生成的游记
    route_map: List[dict]          # 游览路线
    knowledge_cards: List[dict]    # 知识卡片
    virtual_photo: dict            # AI 虚拟打卡描述
    share_text: str                # 朋友圈分享文案


@router.post("/generate", response_model=SouvenirResponse)
async def generate_souvenir(req: SouvenirRequest, db: Session = Depends(get_db)):
    """生成游后数字纪念"""
    sid = req.session_id

    # 1. 获取对话记录
    records = (
        db.query(ChatRecord)
        .filter(ChatRecord.session_id == sid)
        .order_by(ChatRecord.created_at.asc())
        .all()
    )

    if not records:
        raise HTTPException(status_code=404, detail="未找到该会话的游览记录")

    # 2. 获取游客画像
    profile = profile_manager.get_or_create(sid)

    # 3. 提取景点（从对话中识别）
    spots_mentioned = set()
    questions_asked = []
    for r in records:
        if r.user_message:
            questions_asked.append(r.user_message)
            for spot_name in ["灵山大佛","九龙灌浴","灵山梵宫","五印坛城","祥符禅寺","菩提大道","五明桥","佛足坛","降魔浮雕","阿育王柱","弥勒戏沙图","灵山大照壁","百子戏弥勒","佛教文化博物馆","曼荼罗塔","无尽意斋"]:
                if spot_name in (r.user_message or "") or spot_name in (r.answer or ""):
                    spots_mentioned.add(spot_name)

    # 4. AI 生成游记
    journey_text = await _generate_journey(questions_asked, spots_mentioned, profile)

    # 5. 构建路线
    route = [{"order": i+1, "spot": s} for i, s in enumerate(list(spots_mentioned)[:8])]

    # 6. 知识卡片
    knowledge_cards = await _generate_knowledge_cards(list(spots_mentioned)[:5])

    # 7. AI 虚拟打卡描述
    virtual_photo = await _generate_virtual_photo(list(spots_mentioned)[:3], profile)

    # 8. 分享文案
    share_text = f"🏯 灵山胜境一游！AI导游小灵带我走过了{len(spots_mentioned)}个景点，学到了好多佛教文化知识。#灵山慧游 #{profile.get('nickname','游客')}的灵山记忆"

    return SouvenirResponse(
        title=f"{profile.get('nickname','游客')}的灵山记忆",
        date=records[0].created_at.strftime("%Y年%m月%d日") if records[0].created_at else "今日",
        visitor_name=profile.get("nickname", "游客"),
        journey_summary=journey_text,
        route_map=route,
        knowledge_cards=knowledge_cards,
        virtual_photo=virtual_photo,
        share_text=share_text,
    )


async def _generate_journey(questions, spots, profile) -> str:
    """AI 生成个性化游记"""
    if not llm_service.is_available or not questions:
        return f"今天游览了灵山胜境，参观了{len(spots)}个景点，收获满满！"

    prompt = f"""你是一位温暖的旅行记录者。根据以下信息，为游客写一段 200 字左右的个性化游记：

游客名：{profile.get('nickname','游客')}
游览景点：{', '.join(spots) if spots else '灵山胜境'}
关心的问题：{'; '.join(questions[:5])}

要求：
- 用第一人称（"我"）
- 温暖文艺的风格
- 融入景点特色和游览感受
- 150-250 字
- 像是游客自己写的朋友圈游记"""

    try:
        r = llm_service.chat([{"role": "user", "content": prompt}], temperature=0.8, max_tokens=400)
        return r or f"在灵山胜境度过了美好的一天，参观了{len(spots)}个景点。"
    except Exception:
        return f"在灵山胜境度过了美好的一天，参观了{len(spots)}个景点。"


async def _generate_knowledge_cards(spots: list) -> list:
    """为游览过的景点生成知识卡片"""
    cards = []
    for spot in spots[:5]:
        cards.append({
            "spot": spot,
            "title": f"关于{spot}",
            "content": f"灵山胜境核心景点之一",
            "icon": "🏯",
        })

    # 用 AI 丰富内容
    if llm_service.is_available and spots:
        prompt = f"""为以下景点各写一条 30 字以内的有趣知识点（适合做知识卡片）：
{', '.join(spots[:5])}

输出 JSON 数组：[{{"spot":"...","fact":"..."}}, ...]"""
        try:
            r = llm_service.chat([{"role": "user", "content": prompt}], temperature=0.5, max_tokens=300)
            if r:
                import re
                m = re.search(r'\[.*\]', r, re.DOTALL)
                if m:
                    facts = json.loads(m.group(0))
                    for i, f in enumerate(facts):
                        if i < len(cards):
                            cards[i]["content"] = f.get("fact", cards[i]["content"])
        except Exception:
            pass

    return cards


async def _generate_virtual_photo(spots: list, profile) -> dict:
    """AI 生成虚拟打卡照描述"""
    main_spot = spots[0] if spots else "灵山大佛"
    return {
        "spot": main_spot,
        "style": "水墨禅意",
        "description": f"在{main_spot}前，{profile.get('nickname','游客')}双手合十，面带微笑，阳光洒在金色佛像上，身后是蓝天白云。这一刻，时光静止，禅意满溢。",
        "prompt": f"A serene photo at {main_spot}, Lingshan Buddhist scenic area, traditional Chinese architecture, golden Buddha statue, warm sunlight, peaceful atmosphere, cinematic composition",
    }


@router.get("/preview/{session_id}")
async def preview_souvenir(session_id: str, db: Session = Depends(get_db)):
    """预览纪念页（简化版）"""
    records = (
        db.query(ChatRecord)
        .filter(ChatRecord.session_id == session_id)
        .order_by(ChatRecord.created_at.asc())
        .all()
    )
    if not records:
        raise HTTPException(status_code=404, detail="未找到游览记录")

    return {
        "session_id": session_id,
        "message_count": len(records),
        "duration": "约2小时" if len(records) > 10 else "约1小时",
        "spots_visited": len(set(
            r.related_spots for r in records if r.related_spots
        )),
    }


# ============================================================
# 明信片存储 API
# ============================================================

class PostcardSaveRequest(BaseModel):
    title: str = ""
    spot_name: str = ""
    style: str = "国风水墨"
    image_data: str = ""  # base64

@router.post("/postcards", status_code=201)
async def save_postcard(
    data: PostcardSaveRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """保存明信片到数据库"""
    card = Postcard(
        user_id=user_id if user_id else None,
        title=data.title or "灵山记忆",
        spot_name=data.spot_name or "",
        style=data.style or "国风水墨",
        image_data=data.image_data or "",
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return {"id": card.id, "title": card.title, "status": "ok"}


@router.get("/postcards")
async def list_postcards(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取用户的明信片列表"""
    query = db.query(Postcard)
    if user_id:
        query = query.filter(Postcard.user_id == user_id)
    items = query.order_by(Postcard.created_at.desc()).limit(20).all()
    return {
        "items": [
            {
                "id": c.id,
                "title": c.title,
                "spot_name": c.spot_name,
                "style": c.style,
                "image_data": c.image_data,
                "created_at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in items
        ]
    }


@router.delete("/postcards/{card_id}")
async def delete_postcard(
    card_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """删除明信片（管理员可删除任意，游客只能删除自己的）"""
    card = db.query(Postcard).filter(Postcard.id == card_id).first()
    if not card:
        raise HTTPException(404, "明信片不存在")
    # 检查权限：管理员可删任意，普通用户只能删自己的
    is_admin = False
    if user_id:
        u = db.query(User).filter(User.id == user_id).first()
        is_admin = u is not None and u.role == "admin"
    if not is_admin and user_id and card.user_id and card.user_id != user_id:
        raise HTTPException(403, "无权删除他人的明信片")
    db.delete(card)
    db.commit()
    return {"status": "ok"}


# ============================================================
# 明信片风格（公开，供游客端读取启用的风格列表）
# ============================================================
@router.get("/styles")
async def get_enabled_styles(db: Session = Depends(get_db)):
    """返回当前启用的明信片风格（游客端调用）"""
    from app.models.setting import Setting

    STYLE_DEFAULTS = {
        "guofeng": True,
        "watercolor": True,
        "vintage": True,
        "night": True,
        "cartoon": True,
    }
    STYLE_LABELS = {
        "guofeng": "国风插画",
        "watercolor": "清新水彩",
        "vintage": "复古邮票",
        "night": "夜景梦幻",
        "cartoon": "卡通治愈",
    }

    enabled = []
    for key, default_enabled in STYLE_DEFAULTS.items():
        s = db.query(Setting).filter(Setting.key == f"postcard_style_{key}").first()
        is_enabled = s.value == "true" if s else default_enabled
        if is_enabled:
            enabled.append({
                "key": key,
                "label": STYLE_LABELS.get(key, key),
            })

    return {"styles": enabled}
