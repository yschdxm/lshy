"""
大模型服务 — 支持 OpenAI 和 Anthropic 双协议
=============================================
自动检测 provider：openai / anthropic
统一 chat() 接口，调用方无需关心底层协议

答辩要点：双协议兼容架构，可无缝切换不同大模型
"""
import time
import logging
from typing import Optional, List, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """大模型调用服务，支持 OpenAI 和 Anthropic 协议"""

    def __init__(self):
        self._provider = getattr(settings, 'llm_provider', 'openai') or 'openai'
        self._client = None
        self._anthropic_client = None

        if self._is_valid_key(settings.llm_api_key):
            if self._provider == 'anthropic':
                self._init_anthropic()
            else:
                self._init_openai()

    def _init_openai(self):
        """初始化 OpenAI 兼容客户端"""
        from openai import OpenAI
        self._client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )

    def _init_anthropic(self):
        """初始化 Anthropic 客户端"""
        try:
            import anthropic
            self._anthropic_client = anthropic.Anthropic(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
            )
        except ImportError:
            logger.warning("anthropic SDK 未安装，请执行: pip install anthropic")
            self._anthropic_client = None

    @staticmethod
    def _is_valid_key(key: str) -> bool:
        if not key or len(key) < 10:
            return False
        placeholders = ["your-", "sk-your-", "xxx", "placeholder", "change-me"]
        return not any(p in key.lower() for p in placeholders)

    @property
    def is_available(self) -> bool:
        if self._provider == 'anthropic':
            return self._anthropic_client is not None
        return self._client is not None

    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> Optional[str]:
        """
        统一对话接口
        - OpenAI 协议：调用 chat.completions.create
        - Anthropic 协议：调用 messages.create
        """
        if self._provider == 'anthropic':
            return self._chat_anthropic(messages, temperature, max_tokens)
        return self._chat_openai(messages, temperature, max_tokens)

    def _chat_openai(self, messages, temperature, max_tokens) -> Optional[str]:
        if not self._client:
            return None
        try:
            response = self._client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=30,
            )
            content = response.choices[0].message.content
            return content.strip() if content else None
        except Exception as e:
            logger.error(f"LLM API 调用失败: {e}")
            return None

    def _chat_anthropic(self, messages, temperature, max_tokens) -> Optional[str]:
        if not self._anthropic_client:
            return None

        # Anthropic 不支持 system role 在 messages 中，需要单独提取
        system_msg = None
        chat_messages = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_messages.append({"role": m["role"], "content": m["content"]})

        try:
            kwargs = dict(
                model=settings.llm_model,
                messages=chat_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=30,
            )
            if system_msg:
                kwargs["system"] = system_msg

            response = self._anthropic_client.messages.create(**kwargs)

            # Anthropic 返回 content blocks，提取文本部分
            if response.content:
                for block in response.content:
                    if hasattr(block, 'text'):
                        text = block.text.strip()
                        if text:
                            return text
            return None
        except Exception as e:
            logger.error(f"Anthropic API 调用失败: {e}")
            return None

    def embed(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Embedding（仅 OpenAI 兼容协议，不受 provider 影响）"""
        if not settings.embedding_api_key:
            return None
        try:
            from openai import OpenAI
            emb_client = OpenAI(
                api_key=settings.embedding_api_key,
                base_url=settings.embedding_base_url,
            )
            response = emb_client.embeddings.create(
                model=settings.embedding_model,
                input=texts,
                timeout=30,
            )
            return [d.embedding for d in response.data]
        except Exception as e:
            logger.error(f"Embedding API 调用失败: {e}")
            return None


# 全局单例
llm_service = LLMService()
