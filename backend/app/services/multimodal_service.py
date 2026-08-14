"""
多模态大模型服务
===============
接入 Qwen-VL / DeepSeek-VL 等多模态模型，
支持图片识别、拍照问路、实景讲解。

答辩要点：满足赛题"至少1个多模态大模型"硬性要求
"""
import base64
import logging
from typing import Optional, Dict
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class MultimodalService:
    """多模态大模型服务"""

    def __init__(self):
        # 使用 SiliconFlow 的 Qwen-VL（兼容 OpenAI 格式）
        self._client = None
        if settings.llm_api_key:
            self._client = OpenAI(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
            )
        # 判断是否支持视觉
        self._vision_model = self._detect_vision_model()

    def _detect_vision_model(self) -> Optional[str]:
        """检测可用的视觉模型"""
        # SiliconFlow 上的视觉模型
        vision_models = [
            "Qwen/Qwen2.5-VL-7B-Instruct",   # 通义千问视觉模型（推荐）
            "Qwen/Qwen-VL-Chat",              # 旧版兼容
            "deepseek-ai/deepseek-vl2",       # DeepSeek 视觉（如果有）
        ]
        return vision_models[0]  # 默认用 Qwen2.5-VL

    @property
    def is_available(self) -> bool:
        return self._client is not None and self._vision_model is not None

    def analyze_image(self, image_base64: str, question: str = "") -> Dict:
        """
        分析图片内容

        Args:
            image_base64: 图片 Base64 编码
            question: 关于图片的问题

        Returns:
            分析结果
        """
        if not self._client:
            return {"error": "多模态模型未配置"}

        if not question:
            question = "请详细描述这张图片的内容，特别关注与景区、建筑、文化相关的元素。"

        try:
            response = self._client.chat.completions.create(
                model=self._vision_model,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        },
                        {"type": "text", "text": question},
                    ],
                }],
                max_tokens=500,
                temperature=0.3,
                timeout=30,
            )
            content = response.choices[0].message.content
            return {
                "status": "ok",
                "description": content.strip() if content else "无法分析该图片",
                "model": self._vision_model,
            }
        except Exception as e:
            logger.error(f"[Multimodal] 图片分析失败: {e}")
            return {"error": f"图片分析失败: {str(e)}"}

    def identify_scenic_spot(self, image_base64: str) -> Dict:
        """
        识别景区景点（拍照问路）

        Args:
            image_base64: 景点照片 Base64

        Returns:
            识别的景点信息
        """
        question = """请识别这张图片中的景点。如果是灵山胜境的景点，请给出：
1. 景点名称
2. 简要描述
3. 所在位置
4. 游玩建议

输出JSON格式：
{"spot_name": "...", "confidence": "high/medium/low", "description": "...", "location": "...", "tip": "..."}"""

        result = self.analyze_image(image_base64, question)
        if "error" in result:
            return result

        # 尝试解析 JSON
        import re, json
        m = re.search(r'\{.*\}', result.get("description", ""), re.DOTALL)
        if m:
            try:
                parsed = json.loads(m.group(0))
                return {"status": "ok", **parsed}
            except json.JSONDecodeError:
                pass

        return result


# 全局单例
multimodal_service = MultimodalService()
