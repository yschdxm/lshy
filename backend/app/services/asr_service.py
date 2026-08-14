"""
语音识别服务 (ASR)
==================
faster-whisper (CTranslate2) + GPU 加速
中文识别，可流式或整段识别

答辩要点：本地GPU推理，零API成本，中文准确率高
"""
import io
import logging
import tempfile
import os
from typing import Optional

logger = logging.getLogger(__name__)

# 全局模型懒加载
_model = None


def _get_model():
    """懒加载 Whisper 模型（首次调用时自动下载 ~1.5GB）"""
    global _model
    if _model is not None:
        return _model

    try:
        from faster_whisper import WhisperModel

        # 自动检测 GPU
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute = "float16" if device == "cuda" else "int8"

        logger.info(f"[ASR] 加载 Whisper small 模型 | device={device} compute={compute}")
        _model = WhisperModel("small", device=device, compute_type=compute)
        logger.info("[ASR] 模型加载完成")
        return _model
    except ImportError:
        logger.error("[ASR] faster-whisper 未安装，使用降级方案")
        return None
    except Exception as e:
        logger.error(f"[ASR] 模型加载失败: {e}")
        return None


def transcribe_bytes(audio_bytes: bytes, language: str = "zh") -> Optional[str]:
    """
    识别音频字节为文本

    Args:
        audio_bytes: WAV/MP3 音频字节
        language: 语言代码

    Returns:
        识别文本，失败返回 None
    """
    model = _get_model()
    if model is None:
        return _fallback_transcribe(audio_bytes)

    try:
        # 写入临时文件（faster-whisper 需要文件路径或 numpy 数组）
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        segments, info = model.transcribe(
            tmp_path,
            language=language,
            beam_size=5,
            vad_filter=True,        # 过滤静音
            condition_on_previous_text=False,
        )

        text = "".join(seg.text for seg in segments).strip()

        # 清理临时文件
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        if text:
            logger.info(f"[ASR] 识别结果: {text[:80]}...")
        return text

    except Exception as e:
        logger.error(f"[ASR] 识别失败: {e}")
        return _fallback_transcribe(audio_bytes)


def transcribe_file(file_path: str, language: str = "zh") -> Optional[str]:
    """识别音频文件"""
    with open(file_path, "rb") as f:
        return transcribe_bytes(f.read(), language)


def _fallback_transcribe(audio_bytes: bytes) -> Optional[str]:
    """
    降级方案：使用 Google Speech Recognition（需要 speechrecognition 包）
    或直接返回 None 让前端使用浏览器 API
    """
    try:
        import speech_recognition as sr

        # 写入临时 WAV
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_path) as source:
            audio = recognizer.record(source)

        text = recognizer.recognize_google(audio, language="zh-CN")

        try:
            os.unlink(tmp_path)
        except OSError:
            pass

        return text
    except ImportError:
        logger.warning("[ASR] 无可用识别方案，返回 None")
        return None
    except Exception as e:
        logger.error(f"[ASR fallback] 失败: {e}")
        return None
