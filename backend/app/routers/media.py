"""
媒体 API 端点
============
POST /api/media/tts        — 文本 → 语音（返回 MP3 base64）
POST /api/media/asr        — 音频 → 文本
POST /api/media/speak      — 文本 → 语音 + 情感分析 → Agent 状态指令
"""
import base64
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.services.tts_service import synthesize
from app.services.asr_service import transcribe_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["数字人媒体"])


# ============================================================
# Request/Response Models
# ============================================================

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="待合成文本")
    voice: str = Field(default="female", description="语音角色: female/male/elder")
    emotion: str = Field(default="neutral", description="情感: happy/neutral/caring/sad")


class TTSResponse(BaseModel):
    audio_base64: str = Field(..., description="MP3 音频 Base64 编码")
    format: str = "mp3"
    duration_ms: int = 0
    emotion: str = "neutral"


class ASRRequest(BaseModel):
    audio_base64: str = Field(..., description="WAV 音频 Base64 编码")
    language: str = Field(default="zh", description="语言代码")


class ASRResponse(BaseModel):
    text: str = Field(..., description="识别文本")
    language: str = "zh"


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    voice: str = Field(default="female")
    emotion: str = Field(default="neutral")
    # Agent 上下文
    agent_state: Optional[str] = Field(default=None, description="Agent 当前状态: think/plan/act/observe/answer")


class SpeakResponse(BaseModel):
    audio_base64: str
    format: str = "mp3"
    emotion: str = "neutral"
    # 前端数字人状态指令
    avatar_state: str = "idle"       # idle/listening/thinking/speaking/happy/sorry
    expressions: list = []           # 表情动画序列
    subtitle: str = ""               # 字幕文本


# ============================================================
# Endpoints
# ============================================================

@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(req: TTSRequest):
    """文本转语音（MiMo 密钥仅存服务端）"""
    audio_bytes = await synthesize(
        text=req.text,
        voice=req.voice,
        emotion=req.emotion,
    )

    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="语音合成失败")

    # MiMo 返回 WAV，Edge TTS 降级返回 MP3，按魔数区分
    fmt = "wav" if audio_bytes[:4] == b"RIFF" else "mp3"
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return TTSResponse(
        audio_base64=audio_b64,
        format=fmt,
        duration_ms=len(audio_bytes) * 8 // 16,  # 粗略估计
        emotion=req.emotion,
    )


@router.post("/asr", response_model=ASRResponse)
async def speech_to_text(req: ASRRequest):
    """语音转文本"""
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="无效的音频 Base64 编码")

    text = transcribe_bytes(audio_bytes, req.language)

    if text is None:
        raise HTTPException(status_code=500, detail="语音识别失败，请重试")

    return ASRResponse(text=text, language=req.language)


class ImageAnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="图片 Base64")
    question: str = Field(default="识别图片中的景点", description="关于图片的问题")


@router.post("/analyze")
async def analyze_image(req: ImageAnalyzeRequest):
    """拍照识景 — 多模态大模型识别"""
    from app.services.multimodal_service import multimodal_service
    result = multimodal_service.identify_scenic_spot(req.image_base64) if req.question else multimodal_service.analyze_image(req.image_base64, req.question)
    return result


@router.post("/speak", response_model=SpeakResponse)
async def speak_with_avatar(req: SpeakRequest):
    """
    文本 → 语音 + 数字人状态指令

    这是给前端 3D 数字人使用的完整端点：
    返回音频 + 同时指导数字人的表情和口型
    """
    import time

    # 1. TTS 合成
    t0 = time.time()
    audio_bytes = await synthesize(
        text=req.text,
        voice=req.voice,
        emotion=req.emotion,
    )

    if audio_bytes is None:
        raise HTTPException(status_code=500, detail="语音合成失败")

    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    # 2. 确定数字人状态
    avatar_state = _map_emotion_to_avatar(req.emotion)

    # 3. 生成简单口型指令序列（前端用 AnalyserNode 实时分析更精确）
    #    这里提供一个基础序列供参考
    text_len = len(req.text)
    estimated_duration_ms = max(500, text_len * 80)  # 粗略估计

    expressions = [
        {"t": 0, "state": avatar_state},
        {"t": int(estimated_duration_ms), "state": "idle"},
    ]

    return SpeakResponse(
        audio_base64=audio_b64,
        format="mp3",
        emotion=req.emotion,
        avatar_state=avatar_state,
        expressions=expressions,
        subtitle=req.text,
    )


def _map_emotion_to_avatar(emotion: str) -> str:
    """情感标签 → 数字人状态"""
    return {
        "happy": "happy",
        "cheerful": "happy",
        "excited": "happy",
        "neutral": "speaking",
        "gentle": "speaking",
        "caring": "speaking",
        "sad": "sorry",
        "sorry": "sorry",
    }.get(emotion, "speaking")
