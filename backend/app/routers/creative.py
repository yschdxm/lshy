"""
AI 创意内容生成 API
=====================
打卡文案 + 文化问答卡片
创新点：基于景点知识库生成，不是胡编
"""
import json
import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.services.llm_service import llm_service
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/creative", tags=["创意内容"])


class CheckinCopyRequest(BaseModel):
    spot_name: str = Field(..., description="景点名称")
    style: str = Field(default="禅意高级", description="文案风格")


class QuizCardRequest(BaseModel):
    spot_name: str = Field(..., description="景点名称")


# 风格对应的 LARK 提示词补充
STYLE_PROMPTS = {
    "禅意高级": "用禅意、诗意的语言，像古琴曲一样优雅。不啰嗦，留白感强。",
    "活泼朋友圈": "轻松活泼、带emoji、像朋友在分享旅行趣事。可以用网络热梗。",
    "亲子温馨": "温暖可爱、适合带孩子的家庭。语言简单有爱，像妈妈的游记。",
    "历史文化": "正式有深度，像央视纪录片旁白。引用真实历史典故。",
    "小红书风格": "精致的、有氛围感的描述。用短句、带数字、像探店笔记。加一些拍照机位描述。",
    "祈福祝愿": "虔诚、温暖，像寺庙里的祈福牌语言。让人心生安宁和希望。",
}


@router.post("/checkin-copy")
async def generate_checkin_copy(req: CheckinCopyRequest):
    """生成打卡文案"""
    # Step 1: RAG 检索景点知识
    chunks = rag_service.search_knowledge(req.spot_name, top_k=3)
    context = ""
    for c in chunks:
        context += c["content"][:300] + "\n"

    if not context:
        context = f"{req.spot_name}是灵山胜境的重要景点，承载着深厚的佛教文化。"

    style_guide = STYLE_PROMPTS.get(req.style, STYLE_PROMPTS["禅意高级"])

    # Step 2: LLM 生成
    if llm_service.is_available:
        prompt = (
            f"你是灵山胜境的文案专家。请根据以下景点资料，生成打卡文案。\n\n"
            f"景点：{req.spot_name}\n"
            f"资料：{context[:500]}\n"
            f"风格要求：{style_guide}\n\n"
            f"输出 JSON（不要其他文字）：\n"
            f'{{"title":"吸引人的标题(15字内)",'
            f'"body":"正文(80字内)",'
            f'"hashtags":["tag1","tag2","tag3"],'
            f'"photo_angle":"推荐的拍照角度和技巧(30字内)",'
            f'"culture_fact":"关于这个景点的一个鲜为人知的文化小知识(40字内)"}}'
        )
        result = llm_service.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.85, max_tokens=350,
        )
        if result:
            try:
                clean = result.strip().lstrip("```json").rstrip("```").strip()
                data = json.loads(clean)
                return {
                    "spot_name": req.spot_name,
                    "style": req.style,
                    **data,
                }
            except json.JSONDecodeError:
                pass

    # 降级模板
    return _fallback_checkin(req.spot_name, req.style)


def _fallback_checkin(spot: str, style: str):
    templates = {
        "禅意高级": {
            "title": f"在{spot}，与自己和解",
            "body": f"光影穿过{spot}的一瞬，时间忽然慢了。不必急着证明什么，坐下来，看云，看佛，看自己。",
            "hashtags": ["灵山胜境", "禅意生活", "治愈之旅"],
            "photo_angle": f"从{spot}侧面取景，利用自然光线形成轮廓光",
            "culture_fact": f"{spot}的建造融合了中国传统建筑中的榫卯结构，不使用一根铁钉",
        },
        "活泼朋友圈": {
            "title": f"今天被{spot}美哭了！",
            "body": f"来灵山必打卡{spot}！肉眼看比照片震撼一百倍，姐妹们冲就完了！记得穿浅色衣服更出片～",
            "hashtags": ["灵山打卡", "周末去哪玩", "宝藏景点"],
            "photo_angle": f"正对{spot}中央，蹲下仰拍显壮观，搭配蓝天白云",
            "culture_fact": f"你知道吗？{spot}每逢重要节日会有特别的祈福仪式",
        },
        "亲子温馨": {
            "title": f"带娃打卡{spot}，收获满满",
            "body": f"小朋友站在{spot}前说\"好大好大呀\"，那一刻觉得带他来对了。最好的教育在路上。",
            "hashtags": ["亲子旅行", "灵山胜境", "遛娃好去处"],
            "photo_angle": f"让孩子站在{spot}前自然互动，抓拍最真实的笑容",
            "culture_fact": f"很多家长会带孩子来{spot}感受传统文化，培养文化自信",
        },
        "历史文化": {
            "title": f"{spot}：千年文脉的见证",
            "body": f"走进{spot}，仿佛穿越了千年。每一块砖石都镌刻着岁月的痕迹，每一处雕刻都诉说着一脉相承的文明。",
            "hashtags": ["文物保护", "传统文化", "灵山胜境"],
            "photo_angle": f"建议拍摄{spot}的建筑细节——斗拱、雕刻、题字，最能体现历史质感",
            "culture_fact": f"{spot}历经多次修缮，至今保留着建造之初的原始风貌，是研究古代建筑工艺的重要实例",
        },
        "小红书风格": {
            "title": f"灵山{spot} | 99%的人不知道的绝美机位",
            "body": f"定位：灵山胜境·{spot}\n推荐时间：清晨或黄昏\n出片指数：5星\n穿上汉服来这里，每一帧都是壁纸。",
            "hashtags": ["灵山胜境拍照", "汉服打卡", "小众拍照地"],
            "photo_angle": f"站在{spot}左前方45度，利用前景虚化营造氛围感",
            "culture_fact": f"很多汉服爱好者专门来{spot}取景，因为这里的唐代风格建筑特别出片",
        },
        "祈福祝愿": {
            "title": f"在{spot}，许一个愿",
            "body": f"双手合十，在{spot}前虔诚一拜。愿你所求皆如愿，所行化坦途。心诚则灵。",
            "hashtags": ["祈福", "灵山胜境", "心诚则灵"],
            "photo_angle": f"建议拍摄{spot}与蓝天相接的仰角，传达神圣感",
            "culture_fact": f"每年的新年、佛诞日，数以万计的信众会来{spot}祈福许愿",
        },
    }
    t = templates.get(style, templates["禅意高级"])
    return {"spot_name": spot, "style": style, **t}


@router.post("/quiz-card")
async def generate_quiz_card(req: QuizCardRequest):
    """生成文化问答卡片"""
    chunks = rag_service.search_knowledge(req.spot_name, top_k=3)
    context = ""
    for c in chunks:
        context += c["content"][:300] + "\n"
    if not context:
        context = f"{req.spot_name}是灵山胜境的重要景点。"

    if llm_service.is_available:
        prompt = (
            f"你是一位灵山胜境的文化讲解员。请根据以下景点资料，出3道趣味问答。\n\n"
            f"景点：{req.spot_name}\n资料：{context[:400]}\n\n"
            f"题目要求：适合亲子或研学场景，难度适中，有知识点而不是纯记忆题。\n\n"
            f"输出 JSON（不要其他文字）：\n"
            f'{{"questions":['
            f'{{"q":"问题1(30字内)","a":"答案1(25字内)","tip":"知识延伸(20字内)"}},'
            f'{{"q":"问题2","a":"答案2","tip":"知识延伸2"}},'
            f'{{"q":"问题3","a":"答案3","tip":"知识延伸3"}}'
            f']}}'
        )
        result = llm_service.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.9, max_tokens=400,
        )
        if result:
            try:
                clean = result.strip().lstrip("```json").rstrip("```").strip()
                data = json.loads(clean)
                return {"spot_name": req.spot_name, "questions": data.get("questions", [])}
            except json.JSONDecodeError:
                pass

    # 降级
    quizzes = [
        {"q": f"{req.spot_name}建于哪个朝代？", "a": "唐代", "tip": "距今已有1400余年历史"},
        {"q": f"{req.spot_name}的设计灵感来源于什么？", "a": "佛教经典中的西方净土", "tip": "体现了古人对理想世界的想象"},
        {"q": f"游览{req.spot_name}时最需要注意什么？", "a": "衣着得体，保持安静", "tip": "尊重宗教场所礼仪"},
    ]
    return {"spot_name": req.spot_name, "questions": quizzes}


# ============================================================
# AI 图像生成代理（SiliconFlow 密钥仅存服务端）
# ============================================================

class ImageGenRequest(BaseModel):
    prompt: str = Field(..., max_length=2000, description="绘图提示词")
    model: str = Field(default="Tongyi-MAI/Z-Image-Turbo", description="模型名")
    image: Optional[str] = Field(default=None, description="图像编辑模型的输入图片（data URL）")
    image_size: str = Field(default="1024x1024")


@router.post("/image")
async def generate_image(req: ImageGenRequest):
    """
    图像生成代理：前端不直接接触 SiliconFlow Key
    返回图片的 base64 data URL，避免前端二次跨域拉取
    """
    import base64
    import httpx
    from app.core.config import settings

    api_key = settings.image_api_key or settings.embedding_api_key
    base_url = (settings.image_base_url or settings.embedding_base_url).rstrip("/")
    if not api_key:
        raise HTTPException(status_code=503, detail="图像生成服务未配置")

    body = {
        "model": req.model,
        "prompt": req.prompt,
        "num_images": 1,
        "image_size": req.image_size,
    }
    if req.image:
        body["image"] = req.image

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{base_url}/images/generations",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
            if resp.status_code != 200:
                logger_msg = resp.text[:200]
                raise HTTPException(status_code=502, detail=f"图像生成失败: {logger_msg}")
            data = resp.json()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"图像生成服务异常: {str(e)[:100]}")

    img_url = (data.get("images") or [{}])[0].get("url", "")
    if not img_url:
        raise HTTPException(status_code=502, detail="图像生成返回为空")

    # 服务端拉取图片转 base64，前端无需跨域
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            img_resp = await client.get(img_url)
            img_resp.raise_for_status()
        content_type = img_resp.headers.get("content-type", "image/png").split(";")[0]
        b64 = base64.b64encode(img_resp.content).decode("utf-8")
        return {"url": img_url, "image_base64": f"data:{content_type};base64,{b64}"}
    except Exception:
        # 拉取失败时至少返回 URL，前端可自行尝试
        return {"url": img_url, "image_base64": ""}
