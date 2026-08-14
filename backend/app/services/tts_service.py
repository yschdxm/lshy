"""
语音合成服务 (TTS) — MiMo v2.5 TTS
==================================
17种风格 + 30种音频标签 + 声音设计 + 声音克隆

比 Edge TTS 更有情感表现力，支持：
- 情绪：开心/悲伤/生气/悄悄话/夹子音
- 方言：东北话/四川话/河南话/粤语/台湾腔
- 角色：孙悟空/林黛玉
- 音频标签：叹气/抽泣/笑/哽咽/紧张/深呼吸...
"""
import io, re, logging, base64
import asyncio
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# MiMo TTS 配置
MIMO_BASE_URL = "https://api.xiaomimimo.com/v1"
MIMO_TTS_MODEL = "mimo-v2.5-tts"

# 情感 → MiMo 风格映射
EMOTION_STYLE_MAP = {
    "happy":    "开心",
    "cheerful": "开心",
    "excited":  "开心",
    "neutral":  "（无）",
    "caring":   "（无）",
    "gentle":   "（无）",
    "sad":      "悲伤",
    "sorry":    "悲伤",
}

# 数字人名称 → MiMo 语音名
VOICE_MAP = {
    "小灵": "冰糖",    # 温柔知性中文女声
    "female": "冰糖",
    "male": "苏打",     # 中文男声
    "elder": "白桦",    # 沉稳男声
    "mimo_default": "冰糖",  # 前端默认女声哨兵值
}

# 情感 → 推荐的音频标签（让语音更生动）
EMOTION_AUDIO_TAGS = {
    "happy":    "（开心 轻笑）",
    "excited":  "（开心 提高音量）",
    "sad":      "（悲伤 叹气）",
    "sorry":    "（悲伤 小声）",
    "caring":   "（温柔 轻声细语）",
    "neutral":  "",
}


def _add_audio_tags(text: str, emotion: str) -> str:
    """在文本前添加情感音频标签"""
    tag = EMOTION_AUDIO_TAGS.get(emotion, "")
    if tag:
        return f"{tag}{text}"
    return text


async def synthesize(
    text: str,
    voice: str = "female",
    emotion: str = "neutral",
    stream: bool = False,
) -> Optional[bytes]:
    """
    MiMo TTS 语音合成（httpx 直连，不依赖 OpenAI SDK audio 参数）

    Args:
        text: 待合成文本
        voice: 语音角色 (female/male/elder)
        emotion: 情感标签
        stream: 是否流式合成

    Returns:
        WAV 音频字节
    """
    # TTS 使用小米 MiMo API Key（可能与 LLM 不同）
    key = getattr(settings, 'tts_api_key', '') or settings.llm_api_key
    if not key or len(key) < 10:
        return await _fallback_edge_tts(text, voice, emotion)

    try:
        import httpx

        voice_name = VOICE_MAP.get(voice, voice or "冰糖")  # 未知名称按 MiMo 语音名透传
        style = EMOTION_STYLE_MAP.get(emotion, "（无）")
        tagged_text = _add_audio_tags(text, emotion)

        # 构建消息
        messages = []
        if style and style != "（无）":
            messages.append({"role": "assistant", "content": f"（{style}）{tagged_text}"})
        else:
            messages.append({"role": "assistant", "content": tagged_text})

        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        if stream:
            # 流式合成
            body = {
                "model": MIMO_TTS_MODEL,
                "messages": messages,
                "audio": {"format": "pcm16", "voice": voice_name},
                "stream": True,
            }
            import numpy as np
            collected = np.array([], dtype=np.float32)

            async with httpx.AsyncClient(timeout=30) as client:
                async with client.stream(
                    "POST",
                    f"{MIMO_BASE_URL}/chat/completions",
                    headers=headers,
                    json=body,
                ) as resp:
                    if resp.status_code != 200:
                        txt = await resp.aread()
                        logger.warning(f"[TTS] MiMo stream error {resp.status_code}: {txt[:200]}")
                        return await _fallback_edge_tts(text, voice, emotion)

                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                data = json.loads(data_str)
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    audio = delta.get("audio", {})
                                    if audio and "data" in audio:
                                        pcm = base64.b64decode(audio["data"])
                                        arr = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
                                        collected = np.concatenate((collected, arr))
                            except (json.JSONDecodeError, KeyError):
                                continue

            if len(collected) == 0:
                return await _fallback_edge_tts(text, voice, emotion)

            import tempfile, soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                sf.write(f.name, collected, 24000)
                f.flush()
                with open(f.name, "rb") as rf:
                    return rf.read()
        else:
            # 非流式合成
            body = {
                "model": MIMO_TTS_MODEL,
                "messages": messages,
                "audio": {"format": "wav", "voice": voice_name},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{MIMO_BASE_URL}/chat/completions",
                    headers=headers,
                    json=body,
                )
                if resp.status_code != 200:
                    logger.warning(f"[TTS] MiMo error {resp.status_code}: {resp.text[:200]}")
                    return await _fallback_edge_tts(text, voice, emotion)

                data = resp.json()
                audio_data = data["choices"][0]["message"]["audio"]["data"]
                return base64.b64decode(audio_data)

    except ImportError:
        return await _fallback_edge_tts(text, voice, emotion)
    except Exception as e:
        logger.warning(f"[TTS] MiMo 合成失败 ({e})，降级到 Edge TTS")
        return await _fallback_edge_tts(text, voice, emotion)


async def _fallback_edge_tts(text: str, voice: str = "female", emotion: str = "neutral") -> Optional[bytes]:
    """降级方案：Edge TTS"""
    try:
        import edge_tts
        voice_map = {"female": "zh-CN-XiaoxiaoNeural", "male": "zh-CN-YunxiNeural", "elder": "zh-CN-YunyangNeural"}
        style_map = {"happy": "cheerful", "sad": "sad", "neutral": "gentle"}

        voice_name = voice_map.get(voice, voice_map["female"])
        style = style_map.get(emotion, "gentle")

        communicate = edge_tts.Communicate(text=text, voice=voice_name, rate="+0%")
        audio_bytes = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes.write(chunk["data"])
        result = audio_bytes.getvalue()
        return result if result else None
    except Exception as e:
        logger.error(f"[TTS fallback] 失败: {e}")
        return None


def synthesize_sync(text: str, voice: str = "female", emotion: str = "neutral") -> Optional[bytes]:
    """同步封装"""
    try:
        return asyncio.run(synthesize(text, voice, emotion))
    except Exception as e:
        logger.error(f"[TTS sync] {e}")
        return None
