"""
Agent 编排引擎 — Think→Plan→Act→Observe 循环
==============================================
赛题创新核心：将传统一问一答的 RAG 对话升级为具备多步推理能力的智能体。
Agent 能自主调用工具链（知识检索、路线规划、天气查询等），
在复杂问题上展现推理过程，而非简单模板匹配。

答辩要点：
  1. ReAct 模式的四阶段循环，每步可被前端流式展示
  2. 工具系统支持注册/调用/缓存，可扩展
  3. 双速路由：简单问题走 Fast 路径（<1s），复杂问题走 Agent（<5s）
  4. 最大迭代次数限制 + 超时保护，保证稳定性
"""
import json
import re
import time
import logging
import asyncio
from typing import Optional, List, Dict, Any, Callable, AsyncGenerator
from dataclasses import dataclass, field

from app.core.config import settings
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

# ============================================================
# 数据结构
# ============================================================

@dataclass
class ToolResult:
    """工具执行结果"""
    tool_name: str
    success: bool
    data: Any = None
    error: str = ""
    duration_ms: int = 0


@dataclass
class AgentStep:
    """Agent 单步执行记录"""
    phase: str           # think / plan / act / observe
    content: str         # 人类可读的描述
    detail: Any = None   # 结构化数据（可选）
    duration_ms: int = 0


# ============================================================
# 工具注册表
# ============================================================

class ToolRegistry:
    """
    工具注册与调用中心
    - 注册：tool_registry.register("search_knowledge", func, schema)
    - 调用：result = await tool_registry.call("search_knowledge", {"query": "..."})
    - 缓存：同一参数 60s 内不重复调用
    """

    def __init__(self):
        self._tools: Dict[str, Dict] = {}  # name → {fn, schema, description}
        self._cache: Dict[str, tuple] = {}  # cache_key → (result, timestamp)

    def register(
        self,
        name: str,
        fn: Callable,
        schema: Dict[str, Any],
        description: str = "",
    ):
        """注册一个工具"""
        self._tools[name] = {
            "fn": fn,
            "schema": schema,
            "description": description,
        }

    def get_schemas_for_llm(self) -> List[Dict]:
        """生成给 LLM 的 tools 参数（OpenAI function-calling 格式）"""
        tools = []
        for name, meta in self._tools.items():
            tools.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": meta["description"],
                    "parameters": meta["schema"],
                },
            })
        return tools

    def get_tool_list(self) -> List[Dict]:
        """返回人类可读的工具列表"""
        return [
            {"name": name, "description": meta["description"]}
            for name, meta in self._tools.items()
        ]

    async def call(self, name: str, args: Dict[str, Any]) -> ToolResult:
        """调用工具，带缓存"""
        t0 = time.time()

        # 检查缓存
        cache_key = f"{name}:{json.dumps(args, sort_keys=True, ensure_ascii=False)}"
        if cache_key in self._cache:
            cached_result, cached_time = self._cache[cache_key]
            if time.time() - cached_time < 60:
                logger.info(f"[Agent] 缓存命中: {name}")
                return cached_result

        if name not in self._tools:
            return ToolResult(
                tool_name=name,
                success=False,
                error=f"未知工具: {name}",
                duration_ms=int((time.time() - t0) * 1000),
            )

        try:
            fn = self._tools[name]["fn"]
            # 支持同步和异步函数，同步函数在线程池中执行以支持并行
            if asyncio.iscoroutinefunction(fn):
                data = await fn(**args)
            else:
                loop = asyncio.get_event_loop()
                data = await loop.run_in_executor(None, lambda: fn(**args))

            result = ToolResult(
                tool_name=name,
                success=True,
                data=data,
                duration_ms=int((time.time() - t0) * 1000),
            )
            # 写入缓存
            self._cache[cache_key] = (result, time.time())

            # 缓存上限 200 条
            if len(self._cache) > 200:
                oldest = min(self._cache, key=lambda k: self._cache[k][1])
                del self._cache[oldest]

            return result
        except Exception as e:
            logger.error(f"[Agent] 工具 {name} 调用失败: {e}")
            return ToolResult(
                tool_name=name,
                success=False,
                error=str(e),
                duration_ms=int((time.time() - t0) * 1000),
            )


# 全局单例
tool_registry = ToolRegistry()


# ============================================================
# Agent 编排引擎
# ============================================================

class AgentLoop:
    """
    Think→Plan→Act→Observe 循环

    每个迭代：
      1. Think:  分析用户意图、当前已知信息、还需要什么
      2. Plan:   选择下一步行动（调用哪个工具 or 生成最终回答）
      3. Act:    执行选中的工具
      4. Observe: 解读工具返回结果，决定是否继续
    """

    MAX_ITERATIONS = 5         # 最大工具调用次数
    TIMEOUT_SECONDS = 25       # 总超时
    LLM_TEMPERATURE = 0.3      # Agent 需要确定性，温度设低

    def __init__(self):
        self.steps: List[AgentStep] = []
        self.tool_results: List[ToolResult] = []

    # ================================================================
    # System Prompt
    # ================================================================

    SYSTEM_PROMPT = """你是灵山胜境景区的 AI 导游「小灵」，你具备多步推理能力。

## 你的能力
你可以调用以下工具来获取信息：
{tool_descriptions}

## 推理规则
1. 对于简单事实问题（如"大佛多高"），直接调用知识检索工具，1 步完成
2. 对于复杂问题（如路线推荐、比较类问题），**强制在第一步使用 tool_calls 并行调用所有无依赖的工具**
3. 典型并行场景：
   - 比较类："A和B有什么区别" → tool_calls: [search_knowledge("A"), search_knowledge("B")]
   - 综合类："推荐路线" → tool_calls: [recommend_route(...), check_weather(...), list_all_spots()]
   - 关联类："XX附近有什么" → tool_calls: [get_spot_detail("XX"), query_knowledge_graph("XX附近景点")]
4. 只有当工具B确实依赖工具A的结果时，才分步执行
5. 获取足够信息后，生成热情、专业、个性化的中文回答

## 输出格式
每次回复严格按照以下 JSON 格式，不要输出其他内容：

**并行调用多个工具时（优先使用）：**
{{"action": "tool_calls", "tools": [{{"tool": "工具名1", "args": {{"参数": "值"}}}}, {{"tool": "工具名2", "args": {{"参数": "值"}}}}], "reasoning": "为什么同时调用这些工具"}}

**单个工具调用时：**
{{"action": "tool_call", "tool": "工具名", "args": {{"参数": "值"}}, "reasoning": "为什么需要调用这个工具"}}

**准备好回答时：**
{{"action": "final_answer", "answer": "完整的回答文本", "emotion": "happy/neutral/caring"}}

简单确认/闲聊：
{{"action": "final_answer", "answer": "回答文本", "emotion": "neutral"}}

## Self-RAG 自检规则（重要）
- 在生成最终回答前，默问自己：检索到的信息是否充分回答了用户问题？
- 如果检索结果不相关或信息不足 → 换关键词重新 search_knowledge
- 如果向量检索效果不好 → 尝试 query_knowledge_graph（图谱结构更准）
- 如果想要全局了解 → 尝试 search_graph_rag（社区摘要更有全局视野）
- 只有当信息充分时才生成 final_answer

## 注意事项
- 回答要基于工具返回的真实数据，不要编造
- 如果工具调用失败，换一种方式尝试或如实告知用户
- 用热情友好的语气，适当加入 emoji
- 景区名称为"灵山胜境"，包含灵山和拈花湾禅意小镇两个区域"""

    # ================================================================
    # 主循环
    # ================================================================

    async def run(
        self,
        user_message: str,
        history: List[Dict[str, str]] = None,
        session_id: str = "default",
    ) -> AsyncGenerator[AgentStep, None]:
        """
        执行 Agent 循环，流式产出每一步

        Yields:
            AgentStep: 每一步的思考/行动/观察
        """
        t_start = time.time()
        self.steps = []
        self.tool_results = []

        # 集成记忆系统：获取游客画像 + 对话历史 + 情感策略
        from app.services.memory_service import (
            profile_manager, conversation_memory, emotion_tracker,
        )
        profile_summary = profile_manager.get_profile_summary(session_id)
        long_term = conversation_memory.get_long_term_summary(session_id)
        emotion_strategy = emotion_tracker.get_adaptive_strategy(session_id)

        # 构建消息列表
        tools_desc = self._format_tool_descriptions()
        memory_context = ""
        if profile_summary:
            memory_context += f"\n## 游客档案\n{profile_summary}"
        if long_term:
            memory_context += f"\n{long_term}"
        if emotion_strategy:
            memory_context += f"\n## 回复策略\n{emotion_strategy}"

        system_prompt = self.SYSTEM_PROMPT.format(tool_descriptions=tools_desc) + memory_context

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-10:])  # 最近 10 轮

        # 短追问增强：当消息很短且存在历史时，提示LLM参考对话上下文
        enriched_message = user_message
        if history and len(user_message.strip()) <= 15:
            # 从历史中提取最后一个有实质内容的话题
            last_topic = ""
            for m in reversed(history):
                if m.get("role") == "user" and len(m.get("content", "")) > 10:
                    last_topic = m["content"][:100]
                    break
                if m.get("role") == "assistant" and len(m.get("content", "")) > 30:
                    # 提取回答中的景点名
                    spots = re.findall(r'(灵山大佛|九龙灌浴|灵山梵宫|五印坛城|祥符禅寺|梵宫|阿育王柱|拈花湾)', m["content"])
                    if spots:
                        last_topic = spots[0]
                        break
            if last_topic:
                enriched_message = f"[对话上下文：上文在讨论「{last_topic}」]\n{user_message}"

        messages.append({
            "role": "user",
            "content": f"{enriched_message}\n\n[系统指令] 如果需要调用多个工具，请使用 tool_calls 一次性并行调用所有无依赖的工具，不要逐个调用。"
        })

        # 跟踪情感
        emotion_tracker.track(session_id, user_message)

        # ---- 预规划：规则引擎零延迟并行工具调用 ----
        # 短追问（≤15字、有历史、不含景点名/路线/天气等实体词）→ 跳过规则引擎
        has_entity = bool(re.search(r'(灵山大佛|九龙灌浴|灵山梵宫|梵宫|五印坛城|祥符禅寺|拈花湾|阿育王柱|路线|游览|推荐|怎么走|天气|下雨|温度|门票|开放|几点|演出)', user_message))
        is_followup = bool(history) and len(user_message.strip()) <= 15 and not has_entity
        pre_plan = None if is_followup else await self._pre_plan_parallel(user_message, messages)
        effective_max_iter = self.MAX_ITERATIONS
        if pre_plan and len(pre_plan) >= 2:
            yield AgentStep(
                phase="plan",
                content=f"规则引擎预规划：并行调用 {len(pre_plan)} 个工具",
                detail={"tools": [p["tool"] for p in pre_plan], "parallel": True},
            )

            # 并行执行所有工具
            import asyncio as _asyncio
            async def _exec_one(spec):
                return await tool_registry.call(spec["tool"], spec.get("args", {}))
            tasks = [_exec_one(p) for p in pre_plan]
            results = await _asyncio.gather(*tasks)

            yield AgentStep(
                phase="act",
                content=f"并行完成 {len(pre_plan)} 个工具: {', '.join(p['tool'] for p in pre_plan)}",
                detail={"parallel": True, "tools": [p["tool"] for p in pre_plan]},
            )

            # 汇总结果，强制直接回答（不再迭代）
            result_texts = []
            for spec, result in zip(pre_plan, results):
                self.tool_results.append(result)
                result_texts.append(f"[{spec['tool']}]\n{self._format_tool_result(result)}")

            combined = "\n\n".join(result_texts)
            yield AgentStep(
                phase="observe",
                content=f"预规划完成: {len(pre_plan)}个工具并行返回",
                detail={"parallel": True, "count": len(pre_plan)},
            )

            # 限制后续迭代：已有足够信息，强制1轮内回答
            effective_max_iter = 1
            messages.append({
                "role": "user",
                "content": f"预检索结果（并行获取，信息已充分）：\n{combined[:3000]}\n\n请基于以上信息**直接**生成最终回答（final_answer），不要再调用工具。用户问题：{user_message}",
            })

        # ---- 迭代循环（预规划成功时限制1轮直达回答） ----
        for iteration in range(1, effective_max_iter + 1):
            # 超时检查
            if time.time() - t_start > self.TIMEOUT_SECONDS:
                step = AgentStep(
                    phase="observe",
                    content="思考超时，基于已有信息生成回答",
                    duration_ms=int((time.time() - t_start) * 1000),
                )
                self.steps.append(step)
                yield step
                break

            # === Think + Plan: 调用 LLM 决策 ===
            think_step = AgentStep(
                phase="think",
                content=f"第 {iteration} 轮推理中...",
            )
            self.steps.append(think_step)
            yield think_step

            llm_response = await self._call_llm_async(messages)
            if llm_response is None:
                # LLM 不可用，降级
                final = AgentStep(
                    phase="observe",
                    content="AI 服务暂时不可用",
                    detail={"error": "llm_unavailable"},
                )
                self.steps.append(final)
                yield final
                break

            parsed = self._parse_llm_response(llm_response)
            if parsed is None:
                logger.warning(f"[Agent] JSON解析失败，尝试提取answer字段")
                # 尝试从残缺 JSON 中提取 answer 文本
                answer_text = llm_response
                m = re.search(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)"', llm_response)
                if m:
                    answer_text = m.group(1).replace('\\n', '\n').replace('\\"', '"')
                elif llm_response.startswith('{'):
                    # JSON 格式但无法提取，直接截掉前50字符（去除JSON头）
                    answer_text = llm_response[50:] if len(llm_response) > 50 else llm_response

                final = AgentStep(
                    phase="observe",
                    content="生成回答",
                    detail={"answer": answer_text[:1500], "emotion": "neutral"},
                )
                self.steps.append(final)
                yield final
                break

            action = parsed.get("action", "")

            # === final_answer: 结束循环 ===
            if action == "final_answer":
                final = AgentStep(
                    phase="observe",
                    content="综合信息，生成最终回答",
                    detail={
                        "answer": parsed.get("answer", ""),
                        "emotion": parsed.get("emotion", "neutral"),
                        "total_iterations": iteration,
                        "total_tools": len(self.tool_results),
                    },
                )
                self.steps.append(final)
                yield final
                break

            # === tool_calls: 并行执行多个工具 ===
            if action == "tool_calls":
                tools_list = parsed.get("tools", [])
                reasoning = parsed.get("reasoning", "")

                plan_step = AgentStep(
                    phase="plan",
                    content=reasoning or f"并行调用 {len(tools_list)} 个工具",
                    detail={"tools": [t["tool"] for t in tools_list], "parallel": True},
                )
                self.steps.append(plan_step)
                yield plan_step

                # 并行执行所有工具
                import asyncio as _asyncio
                async def _call_one(tool_spec):
                    return await tool_registry.call(
                        tool_spec.get("tool", ""),
                        tool_spec.get("args", {}),
                    )

                tasks = [_call_one(t) for t in tools_list]
                results = await _asyncio.gather(*tasks)

                # 批量处理结果
                act_step = AgentStep(
                    phase="act",
                    content=f"并行执行 {len(tools_list)} 个工具完成",
                    detail={"tools": [t["tool"] for t in tools_list], "parallel": True},
                )
                self.steps.append(act_step)
                yield act_step

                # 将结果汇总发送
                result_summaries = []
                for i, (tool_spec, result) in enumerate(zip(tools_list, results)):
                    self.tool_results.append(result)
                    tname = tool_spec.get("tool", f"tool_{i}")
                    summary = self._format_tool_result(result)
                    result_summaries.append(f"[{tname}]\n{summary}")

                combined = "\n\n".join(result_summaries)
                observe_step = AgentStep(
                    phase="observe",
                    content=f"并行工具执行完成 ({len(tools_list)}个)",
                    detail={"tools_called": len(tools_list), "success_count": sum(1 for r in results if r.success)},
                )
                self.steps.append(observe_step)
                yield observe_step

                messages.append({
                    "role": "assistant",
                    "content": json.dumps(parsed, ensure_ascii=False),
                })
                messages.append({
                    "role": "user",
                    "content": f"并行工具调用结果：\n{combined[:3000]}",
                })
                continue

            # === tool_call: 单工具调用（兼容） ===
            if action == "tool_call":
                tool_name = parsed.get("tool", "")
                tool_args = parsed.get("args", {})
                reasoning = parsed.get("reasoning", "")

                plan_step = AgentStep(
                    phase="plan",
                    content=reasoning or f"调用工具: {tool_name}",
                    detail={"tool": tool_name, "args": tool_args},
                )
                self.steps.append(plan_step)
                yield plan_step

                act_step = AgentStep(
                    phase="act",
                    content=f"执行 {tool_name}...",
                    detail={"tool": tool_name},
                )
                self.steps.append(act_step)
                yield act_step

                result = await tool_registry.call(tool_name, tool_args)
                self.tool_results.append(result)

                observe_msg = self._format_tool_result(result)
                observe_step = AgentStep(
                    phase="observe",
                    content=observe_msg[:200],
                    detail={
                        "tool": tool_name,
                        "success": result.success,
                        "duration_ms": result.duration_ms,
                    },
                )
                self.steps.append(observe_step)
                yield observe_step

                messages.append({
                    "role": "assistant",
                    "content": json.dumps(parsed, ensure_ascii=False),
                })
                messages.append({
                    "role": "user",
                    "content": f"工具 {tool_name} 返回结果：\n{self._format_tool_result(result)}",
                })
                continue

            # 未知 action
            logger.warning(f"[Agent] 未知 action: {action}")
            break

        # === 循环超限，强制生成最终回答 ===
        # 注意：如果已有答案（action == "final_answer" 后 break），不重复生成
        has_answer = any(
            s.phase == "observe" and s.detail and isinstance(s.detail, dict) and "answer" in s.detail
            for s in self.steps
        )
        if not has_answer and iteration >= self.MAX_ITERATIONS:
            messages.append({
                "role": "user",
                "content": "你已经调用了足够多的工具。请直接输出最终回答（纯文本，不要JSON格式），用热情友好的导游语气。",
            })
            llm_response = await self._call_llm_async(messages)
            answer = llm_response or "抱歉，我暂时无法回答您的问题，请稍后再试。"
            final = AgentStep(
                phase="observe",
                content="达到最大推理步数，强制生成回答",
                detail={
                    "answer": answer,
                    "emotion": "neutral",
                    "total_iterations": self.MAX_ITERATIONS,
                    "total_tools": len(self.tool_results),
                    "forced": True,
                },
            )
            self.steps.append(final)
            yield final

    # ================================================================
    # 辅助方法
    # ================================================================

    def _format_tool_descriptions(self) -> str:
        """格式化工具列表给 LLM"""
        tools = tool_registry.get_tool_list()
        lines = []
        for t in tools:
            lines.append(f"- **{t['name']}**: {t['description']}")
        return "\n".join(lines) if lines else "（暂无可用工具）"

    @staticmethod
    def _format_tool_result(result: ToolResult) -> str:
        """格式化工具结果为 LLM 可读文本"""
        if not result.success:
            return f"调用失败: {result.error}"
        data = result.data
        if isinstance(data, str):
            return data[:2000]  # 截断过长结果
        if isinstance(data, (dict, list)):
            return json.dumps(data, ensure_ascii=False, indent=2)[:2000]
        return str(data)[:2000]

    async def _call_llm_async(self, messages: List[Dict]) -> Optional[str]:
        """异步调用 LLM（在线程池中运行同步函数）"""
        return await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: llm_service.chat(
                messages=messages,
                temperature=self.LLM_TEMPERATURE,
                max_tokens=1000,  # 足够容纳完整 JSON + 详细回答
            ),
        )

    async def _pre_plan_parallel(self, user_message: str, messages: List[Dict]) -> Optional[List[Dict]]:
        """规则引擎预规划：零延迟判断哪些工具可以并行调用"""
        msg = user_message
        tools = []

        # 短追问检测：消息很短且存在历史对话 → 规则引擎退让，让LLM用上下文理解
        is_short_followup = len(msg) <= 10 and len(messages) > 2

        # 提取景点名
        spot_names = re.findall(r'(灵山大佛|九龙灌浴|灵山梵宫|五印坛城|祥符禅寺|菩提大道|五明桥|佛足坛|降魔浮雕|阿育王柱|弥勒戏沙图|佛教文化博物馆|曼荼罗塔|无尽意斋|拈花|灵山大照壁|百子戏弥勒)', msg)

        # 比较/多景点 → 并行查多个
        if len(spot_names) >= 2:
            for name in spot_names[:3]:
                tools.append({"tool": "search_knowledge", "args": {"query": f"{name} 特色 介绍"}})
        elif len(spot_names) == 1:
            tools.append({"tool": "search_knowledge", "args": {"query": spot_names[0]}})

        # 路线规划
        if any(w in msg for w in ["路线", "游览", "推荐", "规划", "安排", "怎么走", "小时"]):
            if not any(t["tool"] == "recommend_route" for t in tools) and "比较" not in msg:
                # 提取时长
                hours = 3
                m = re.search(r'(\d+)\s*小时', msg)
                if m: hours = int(m.group(1))
                m = re.search(r'(半天|半日|一日|全天)', msg)
                if m: hours = {"半天":4,"半日":4,"一日":8,"全天":8}.get(m.group(1), 3)

                interests = []
                if any(w in msg for w in ["佛教","文化","历史","禅"]): interests.append("佛教文化")
                if any(w in msg for w in ["亲子","孩子","儿童","小朋友"]): interests.append("亲子")
                if any(w in msg for w in ["拍照","摄影","打卡","好看"]): interests.append("拍照打卡")
                if any(w in msg for w in ["祈福","许愿","求签","平安"]): interests.append("祈福")
                if not interests: interests = ["佛教文化"]

                companions = "家庭" if any(w in msg for w in ["亲子","孩子","家庭","老人"]) else "朋友"
                energy = "轻松" if any(w in msg for w in ["老人","轻松","不累","慢慢"]) else "适中"

                tools.append({"tool": "recommend_route", "args": {
                    "duration_hours": hours, "interests": interests,
                    "companions": companions, "energy_level": energy,
                }})

        # 天气
        if any(w in msg for w in ["天气", "下雨", "温度", "热", "冷", "晒"]):
            tools.append({"tool": "check_weather", "args": {"city": "无锡"}})

        # 图谱查询（关联性问题）
        if any(w in msg for w in ["附近", "周边", "相邻", "邻近", "距离"]):
            if "query_knowledge_graph" not in [t["tool"] for t in tools]:
                tools.append({"tool": "query_knowledge_graph", "args": {"question": msg[:100]}})

        # 默认：至少查一次知识库
        if not tools:
            query = msg[:200]
            # 短追问：从历史中提取上文最后一个话题作为搜索上下文
            if is_short_followup:
                for m in reversed(messages):
                    if m.get("role") == "user" and len(m.get("content","")) > 10:
                        query = f"{m['content']} {msg}"
                        break
            tools.append({"tool": "search_knowledge", "args": {"query": query}})

        # 去重
        seen = set()
        unique = []
        for t in tools:
            key = t["tool"] + json.dumps(t.get("args", {}), ensure_ascii=False)
            if key not in seen:
                seen.add(key)
                unique.append(t)

        return unique if len(unique) >= 2 else None

    @staticmethod
    def _parse_llm_response(text: str) -> Optional[Dict]:
        """解析 LLM 返回的 JSON，支持多种格式和容错"""
        if text is None:
            return None

        text = text.strip()

        # 尝试直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 尝试提取 ```json ... ``` 代码块
        m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1).strip())
            except json.JSONDecodeError:
                pass

        # 尝试提取最外层 { ... }
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                # 如果仍失败，尝试修复常见问题：替换未转义的换行
                try:
                    fixed = m.group(0).replace('\n', '\\n').replace('\r', '')
                    return json.loads(fixed)
                except json.JSONDecodeError:
                    pass

        # 最后容错：如果文本看起来像自然语言（非JSON），直接当作回答
        if len(text) > 20 and not text.startswith('{'):
            return {"action": "final_answer", "answer": text[:2000], "emotion": "neutral"}

        return None


# 全局单例
agent_loop = AgentLoop()


# ============================================================
# 意图路由器
# ============================================================

# 简单问题关键词（匹配到则走 Fast 路径）
SIMPLE_PATTERNS = [
    # 高度/尺寸
    r'(多高|多长|多宽|多大|多少米|几米)',
    # 时间
    r'(几点|什么时候|时间|几点钟|开放时间|营业时间|关门)',
    # 价格
    r'(多少钱|票价|门票|价格|费用)',
    # 单一事实
    r'(是什么|是谁|什么是|什么叫|哪个|在哪里|怎么去|电话|地址)',
    # 简短问候
    r'^(你好|您好|嗨|hello|hi|在吗|谢谢|感谢|再见|拜拜)[\s!！。．\.\?？\~～]*$',
]

# 复杂问题关键词（匹配到则走 Agent 路径）
COMPLEX_PATTERNS = [
    r'(推荐|建议|规划|安排|路线|行程|游览)',
    r'(比较|对比|区别|哪个好|哪个更)',
    r'(为什么|原因|怎么|如何|怎样)',
    r'(帮我|我要|我想|我只有|带孩子|老人|亲子|情侣)',
    r'(天气|今天|明天|现在|此刻)',
    r'(除了|还有|附近|周边|顺便|接着)',
]


def route_intent(message: str) -> str:
    """
    意图路由器：决定走 Fast（直接 RAG）还是 Agent（多步推理）

    返回: "fast" | "agent"
    """
    import re as _re

    msg = message.strip()

    # 空消息 → fast
    if not msg:
        return "fast"

    # 极短消息（< 5 字）→ fast
    if len(msg) < 5:
        return "fast"

    # 匹配复杂模式 → agent
    for pattern in COMPLEX_PATTERNS:
        if _re.search(pattern, msg):
            return "agent"

    # 匹配简单模式 → fast
    for pattern in SIMPLE_PATTERNS:
        if _re.search(pattern, msg):
            return "fast"

    # 默认：消息 > 15 字 → agent，否则 fast
    if len(msg) > 15:
        return "agent"
    return "fast"
