"""
禅意陪游模式 API
=================
根据游客心情和偏好，生成有温度的 AI 导游讲解内容
创新点：不是冷冰冰的路线推荐，而是融合情绪感知、文化叙事、陪伴感的导览体验
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

from app.services.llm_service import llm_service

router = APIRouter(prefix="/api/zen", tags=["禅意陪游"])


class ZenGenerateRequest(BaseModel):
    mood: str = Field(default="放松", description="心情: 放松/焦虑/好奇/祈福/陪孩子/想拍照")
    style: str = Field(default="慢慢讲", description="陪游风格")


class ZenSpotScriptRequest(BaseModel):
    spot_name: str = Field(..., description="景点名称")
    mood: str = Field(default="放松")
    spot_intro: str = Field(default="", description="景点简介")
    spot_highlight: str = Field(default="")


# 预设禅意开场白（LLM 不可用时降级）
ZEN_OPENINGS = {
    ("放松", "慢慢讲"): (
        "今天我们不急着赶路。从大照壁开始，让灵山的每一缕风、每一片叶，"
        "都成为你旅途中的同行者。慢下来，才能真正看见。"
    ),
    ("放松", "像朋友一样聊天"): (
        "嗨，今天咱们就随便走走、慢慢聊聊。灵山的故事很多，不急，"
        "我挑最有趣的讲给你听，累了就坐下歇歇。"
    ),
    ("焦虑", "重点讲"): (
        "看得出您想高效游览。放心，我为您规划了最精简的路线，"
        "核心景点一个不落，多余的脚步一步不走。跟着我，轻松不焦躁。"
    ),
    ("焦虑", "像专业导游一样讲解"): (
        "时间宝贵，我会用最专业的方式为您导览。"
        "核心景点、最佳路线、时间节点都已为您规划好，请放心跟我走。"
    ),
    ("好奇", "慢慢讲"): (
        "您有一颗探索的心，真好。灵山的每一处都有故事——"
        "照壁上的字是谁题的？大佛为什么要建 88 米高？今天我们一起寻找答案。"
    ),
    ("好奇", "像专业导游一样讲解"): (
        "欢迎来到灵山胜境。今天我会带您深入了解佛教建筑艺术、"
        "千年历史典故和鲜为人知的文化细节。准备好您的耳朵和好奇心，我们出发吧。"
    ),
    ("祈福", "慢慢讲"): (
        "今天，不为赶路，只为祈福。从佛足坛到灵山大佛，"
        "每一步都是一次修行。愿今天的灵山之旅，带给您内心的宁静与力量。"
    ),
    ("祈福", "适合孩子听"): (
        "小朋友们，今天我们要去一个很神奇的地方！那里有一尊比楼房还高的大佛，"
        "有一个会喷水的九龙喷泉，还有一个会笑的大肚子弥勒佛。准备好了吗？出发！"
    ),
    ("陪孩子", "适合孩子听"): (
        "小朋友你好呀！我是你的灵山小伙伴。今天我们会遇到会喷水的龙、"
        "会笑的大佛，还有好多好多有趣的雕塑。每到一个地方，我都会给你讲一个小故事哦！"
    ),
    ("陪孩子", "像朋友一样聊天"): (
        "带孩子来灵山，最重要的是开心！我会用最有趣的方式讲解，"
        "不用太严肃，让孩子在玩中学、在笑中感受。有什么问题随时打断我～"
    ),
    ("想拍照", "像朋友一样聊天"): (
        "今天的目标很明确——出片！我知道灵山每一个绝美构图角度，"
        "从大照壁的光影到梵宫的穹顶。跟着我，你的朋友圈今天会很忙。"
    ),
    ("想拍照", "慢慢讲"): (
        "拍照不只是按快门，更是捕捉当下的心境。今天我会带你走遍灵山最美的角落，"
        "告诉你最佳光线时间，也教你如何用镜头讲述故事。"
    ),
}

# 默认
_DEFAULT_OPENING = (
    "欢迎来到灵山胜境。今天，让我们以一颗平静的心，"
    "开启这段禅意之旅。不必匆忙，每一处风景都值得细细品味。"
)


def _get_opening(mood: str, style: str) -> str:
    """获取禅意开场白"""
    key = (mood, style)
    if key in ZEN_OPENINGS:
        return ZEN_OPENINGS[key]
    # 模糊匹配
    for (m, s), text in ZEN_OPENINGS.items():
        if m == mood or s == style:
            return text
    return _DEFAULT_OPENING


@router.post("/generate")
async def generate_zen(req: ZenGenerateRequest):
    """生成今日禅意导览开场白"""
    # 尝试 LLM 生成
    if llm_service.is_available:
        prompt = (
            f"你是一位灵山胜境（无锡5A景区）的禅意导游。\n"
            f"游客今天的心情是「{req.mood}」，希望陪游风格是「{req.style}」。\n"
            f"请为这位游客写一段80字以内的开场白，要：\n"
            f"1. 有禅意，但不做作\n"
            f"2. 呼应游客的心情\n"
            f"3. 让人想继续听下去\n"
            f"4. 风格匹配：慢慢讲→温润舒缓，重点讲→干练有力，"
            f"像朋友→亲切自然，像导游→专业有料，适合孩子→活泼有趣\n"
            f"只输出开场白，不要其他文字。"
        )
        result = llm_service.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.9, max_tokens=150,
        )
        if result:
            return {"opening": result.strip(), "mood": req.mood, "style": req.style, "generated_by": "ai"}

    # 降级
    opening = _get_opening(req.mood, req.style)
    return {"opening": opening, "mood": req.mood, "style": req.style, "generated_by": "template"}


@router.post("/spot-script")
async def generate_spot_script(req: ZenSpotScriptRequest):
    """为单个景点生成禅意讲解卡片"""
    spot = req.spot_name
    intro = req.spot_intro[:200] if req.spot_intro else f"{spot}是灵山胜境的重要景点"

    # 模板化禅意内容
    zen_reminders = {
        "放松": f"此刻，站在{spot}前，深吸一口气，感受山间的风与光影。不必急着拍照，先用眼睛和心去记住这一刻。",
        "焦虑": f"来到{spot}，先把时间放一放。这个景点值得你停留片刻，其他的交给我来安排。",
        "好奇": f"你知道吗？{spot}背后藏着一个你可能从未听过的故事...",
        "祈福": f"在{spot}前，闭上眼睛，许一个心愿。据说这里的每一缕香火都承载着千年的祝福。",
        "陪孩子": f"小朋友快看！{spot}是不是很壮观？让我给你讲一个关于它的神奇故事！",
        "想拍照": f"站在这个角度，往左移两步——对，就是这里！阳光刚好洒在{spot}上，这是今天的黄金机位。",
    }

    zen_reminder = zen_reminders.get(req.mood, zen_reminders["放松"])

    # 尝试 LLM 生成
    if llm_service.is_available:
        prompt = (
            f"你是灵山胜境的禅意导游。游客心情「{req.mood}」，正在游览「{spot}」。\n"
            f"景点简介：{intro}\n"
            f"请输出 JSON（不要其他文字）：\n"
            f'{{"story":"关于{spot}的一个文化小故事（60字以内）",'
            f'"photo_tip":"拍照建议（30字以内）",'
            f'"question":"一个让游客思考的互动问题（25字以内）",'
            f'"post_text":"适合发朋友圈的文案，含 #灵山胜境（40字以内）"}}'
        )
        result = llm_service.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.8, max_tokens=250,
        )
        if result:
            try:
                clean = result.strip().lstrip("```json").rstrip("```").strip()
                data = json.loads(clean)
                return {
                    "spot_name": spot,
                    "zen_reminder": zen_reminder,
                    "story": data.get("story", f"{spot}有着悠久的历史和文化底蕴"),
                    "photo_tip": data.get("photo_tip", f"{spot}适合在上午自然光下拍摄"),
                    "question": data.get("question", f"你从{spot}中感受到了什么？"),
                    "post_text": data.get("post_text", f"在灵山{spot}，遇见内心的宁静 #灵山胜境"),
                }
            except json.JSONDecodeError:
                pass

    # 降级模板
    stories = {
        "灵山大佛": "88米高的青铜佛像，历时三年铸造，1997年落成开光。佛面含微笑，无论从哪个角度看，佛都在注视着你。",
        "九龙灌浴": "太子佛诞生时，九条龙从天空飞来喷水浴佛。现在每天上演的九龙灌浴表演，再现了这庄严祥瑞的一幕。",
        "灵山梵宫": "梵宫被誉为\"东方卢浮宫\"，内部穹顶壁画由百位工艺师历时两年手绘完成，每一笔都蕴含着虔诚。",
        "五印坛城": "这座藏式建筑以西藏布达拉宫为原型设计，五层楼阁象征佛教五方五佛，转经筒内藏有108卷经文。",
    }
    story = stories.get(spot, f"{spot}是灵山胜境的重要景点，承载着深厚的佛教文化底蕴。")

    return {
        "spot_name": spot,
        "zen_reminder": zen_reminder,
        "story": story,
        "photo_tip": f"{spot}是灵山标志性景点，建议利用自然光线拍摄，早晨或傍晚效果最佳。",
        "question": f"站在{spot}前，你最想许下什么心愿？",
        "post_text": f"在灵山{spot}，遇见内心的宁静。 #灵山胜境 #禅意之旅",
    }
