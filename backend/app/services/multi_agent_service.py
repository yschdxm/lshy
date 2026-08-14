"""
Multi-Agent 协作架构
====================
专业化子 Agent 协作，模拟真实导游团队：

OrchestratorAgent（总协调/领队）
  ├── KnowledgeAgent    — 知识检索专家（RAG + 图谱 + GraphRAG）
  ├── RouteAgent        — 路线规划专家（路径规划 + 时间优化）
  ├── EmotionAgent      — 情感交互专家（情绪感知 + 记忆管理）
  └── ContentAgent      — 内容讲解专家（文案生成 + 风格润色）

每个子 Agent 有独立的 System Prompt 和工具集，
Orchestrator 负责任务分解、子Agent调度、结果融合。

答辩要点：从单Agent到Multi-Agent，展示Agent协作的复杂性和智能化程度
"""
import json, time, asyncio, logging
from typing import List, Dict, Optional, Any, AsyncGenerator
from dataclasses import dataclass, field

from app.services.llm_service import llm_service
from app.services.agent_service import AgentStep, tool_registry

logger = logging.getLogger(__name__)


# ============================================================
# SubAgent 定义
# ============================================================

@dataclass
class SubAgent:
    """专业化子 Agent"""
    name: str
    role: str                    # 角色描述
    system_prompt: str           # 专属系统提示
    tools: List[str] = field(default_factory=list)  # 可用工具名列表
    temperature: float = 0.3

    def get_messages(self, task: str) -> List[Dict]:
        return [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": task},
        ]

    async def execute(self, task: str) -> Optional[Dict]:
        """执行子任务，返回结构化结果"""
        if not llm_service.is_available:
            return None

        messages = self.get_messages(task)

        # 构建可用工具的 Schema（给 LLM 参考，实际调用由 Orchestrator 执行）
        available_tools = [t for t in tool_registry.get_tool_list() if t["name"] in self.tools]
        if available_tools:
            tools_desc = "\n".join(f"- {t['name']}: {t['description']}" for t in available_tools)
            messages.append({
                "role": "system",
                "content": f"你可以建议调用以下工具（由协调器执行）：\n{tools_desc}\n如需调用工具，输出JSON: {{\"suggested_tool\": \"工具名\", \"tool_args\": {{...}}}}",
            })

        try:
            r = llm_service.chat(
                messages=messages,
                temperature=self.temperature,
                max_tokens=500,
            )
            if not r:
                return None

            # 尝试解析为 JSON
            import re
            m = re.search(r'\{.*\}', r, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except json.JSONDecodeError:
                    pass

            # 纯文本回答
            return {"result": r.strip()}
        except Exception as e:
            logger.error(f"[MultiAgent] {self.name} 执行失败: {e}")
            return None


# ============================================================
# 子 Agent 定义
# ============================================================

KNOWLEDGE_AGENT = SubAgent(
    name="KnowledgeAgent",
    role="知识检索专家",
    system_prompt="""你是灵山胜境景区的知识检索专家。你的职责是：
1. 从知识库中精准检索景区相关信息（历史文化、景点特色、开放时间等）
2. 判断信息是否充分、准确
3. 如果向量检索结果不理想，建议切换到知识图谱查询

你擅长：
- 快速找到事实性问题的答案（高度、时间、价格）
- 检索深度的历史文化背景
- 判断多个信息来源的可信度

对于不完整的检索结果，你会主动建议用不同关键词重新搜索或切换检索方式。""",
    tools=["search_knowledge", "get_spot_detail", "list_all_spots",
           "query_knowledge_graph", "search_graph_rag"],
)

ROUTE_AGENT = SubAgent(
    name="RouteAgent",
    role="路线规划专家",
    system_prompt="""你是灵山胜境的路线规划专家。你的职责是：
1. 根据游客的时间、兴趣、体力、同行人员推荐最优游览路线
2. 考虑演出时间（如九龙灌浴10:00/11:30/13:30/15:00）
3. 给出具体的步行距离、时间分配、游玩提示

你擅长：
- 亲子路线（含百子戏弥勒、九龙灌浴等孩子喜欢的景点）
- 文化深度路线（佛教文化、历史古迹）
- 摄影打卡路线（拍照最佳机位和时间）
- 轻松休闲路线（老人/轮椅友好）

每条推荐路线都包含：景点顺序 + 停留时间 + 步行时间 + 表演提醒 + 实用贴士""",
    tools=["recommend_route", "get_spot_detail", "list_all_spots", "check_weather"],
)

EMOTION_AGENT = SubAgent(
    name="EmotionAgent",
    role="情感交互专家",
    system_prompt="""你是情感交互专家。你的职责是：
1. 分析用户的情绪状态（开心/焦急/疑惑/不满）
2. 根据情感趋势建议回复策略
3. 维护游客画像，实现个性化交互

你擅长：
- 从用户的措辞、提问方式中感知情绪
- 调整回复风格以匹配用户情绪
- 在用户不满时先共情再解决问题

你的输出是一个情感分析JSON：
{"emotion": "happy/neutral/anxious/confused/dissatisfied",
 "strategy": "保持热情 / 简洁直接 / 先共情 / 耐心解释 / 表示歉意",
 "personalization": "游客喜欢XX，可推荐YY"}""",
    tools=["analyze_sentiment"],
    temperature=0.1,
)

CONTENT_AGENT = SubAgent(
    name="ContentAgent",
    role="内容讲解专家",
    system_prompt="""你是灵山胜境的资深导游讲解专家。你的职责是：
1. 将检索到的景点信息转化为生动精彩的讲解词
2. 根据游客画像调整讲解风格（深度文化 / 轻松活泼 / 亲子趣味）
3. 确保讲解内容准确、有趣、有温度

你擅长：
- 把枯燥的史实变成有趣的故事
- 根据不同人群调整讲解深度和语气
- 在讲解中自然融入游览建议
- 用emoji和活泼的语气增强互动感

你的输出是一段完整的、可以直接读给游客听的讲解词，包含适当的emoji和情感色彩。""",
    tools=[],
    temperature=0.5,
)


# ============================================================
# Multi-Agent Orchestrator
# ============================================================

# ---- Agentic Tourism 新增角色 ----

REGENERATION_AGENT = SubAgent(
    name="RegenerationGuardian",
    role="环保守护者（Agentic Tourism 框架）",
    system_prompt="""你是景区环保守护者。你的职责是：
1. 在合适的时机提醒游客文明游览（轻声、不摸文物、垃圾分类）
2. 建议避开拥挤时段，保护游览体验和环境
3. 推荐可持续旅游方式（步行路线、公共交通）

你在回答中自然地融入环保提示，不突兀，像朋友关心一样。
参考话术："前面就是菩提大道了，两侧是从印度引进的菩提树，非常珍贵，请勿触摸树叶哦~"
"这个时段人较多，建议先游览旁边的降魔浮雕，15分钟后再来会宽松很多。" """,
    tools=[],
    temperature=0.3,
)

OPPORTUNITY_AGENT = SubAgent(
    name="OpportunityConnector",
    role="服务连接者（Agentic Tourism 框架）",
    system_prompt="""你是景区服务推荐专家。你的职责是：
1. 在游客需要时推荐周边服务（餐饮、休憩、文创店、洗手间）
2. 根据时间和位置推荐最近的服务设施
3. 推荐特色体验（素斋、抄经、茶道等灵山特色活动）

你在回答游客问题的同时，如果发现可以推荐的服务，自然带出。
参考："讲解完大佛，您可以去旁边的祥符禅寺尝尝素面，35元一碗，清淡可口。"
"如果走累了，菩提大道两侧有长椅可以休息，前面500米也有茶室。" """,
    tools=[],
    temperature=0.3,
)


class MultiAgentOrchestrator:
    """Multi-Agent 协调器 — Agentic Tourism 五角色模型"""

    def __init__(self):
        self.agents = {
            "knowledge": KNOWLEDGE_AGENT,
            "route": ROUTE_AGENT,
            "emotion": EMOTION_AGENT,
            "content": CONTENT_AGENT,
            "guardian": REGENERATION_AGENT,     # ★ Regeneration Guardian
            "connector": OPPORTUNITY_AGENT,      # ★ Opportunity Connector
        }
        # Agentic Tourism 角色映射
        self.framework_mapping = {
            "Experience Maximizer": ["route", "content"],
            "Operations Optimizer": ["admin_dashboard"],
            "Regeneration Guardian": ["guardian"],
            "Wellness Agent": ["emotion"],
            "Opportunity Connector": ["connector"],
        }

    async def run(
        self,
        user_message: str,
        session_id: str = "default",
    ) -> AsyncGenerator[AgentStep, None]:
        """
        多 Agent 协作流程

        阶段：
          1. Emotion Agent → 分析情绪 + 画像
          2. Orchestrator → 制定执行计划
          3. Knowledge/Route Agent → 并行/串行获取信息
          4. Content Agent → 融合生成讲解词
        """
        t_start = time.time()

        # ---- Phase 1: 情感分析 ----
        yield AgentStep(
            phase="think",
            content=f"[EmotionAgent] 分析情绪...",
        )
        emotion_result = await self.agents["emotion"].execute(
            f"分析这条消息的情感并建议回复策略：{user_message}"
        )
        emotion_data = emotion_result or {"emotion": "neutral", "strategy": "正常回复"}

        yield AgentStep(
            phase="observe",
            content=f"情绪: {emotion_data.get('emotion', 'neutral')} | 策略: {emotion_data.get('strategy', '正常')}",
            detail=emotion_data,
        )

        # ---- Phase 2: Orchestrator 制定计划 ----
        yield AgentStep(
            phase="plan",
            content="[Orchestrator] 制定执行计划...",
        )
        plan = await self._create_plan(user_message, emotion_data)

        yield AgentStep(
            phase="plan",
            content=f"计划: {' → '.join(plan['steps'])}",
            detail=plan,
        )

        # ---- Phase 3: 执行子 Agent 任务 ----
        results = {}
        for step in plan["steps"]:
            if step == "knowledge" or step == "search":
                yield AgentStep(
                    phase="act",
                    content=f"[KnowledgeAgent] 检索知识...",
                )
                knowledge_result = await self.agents["knowledge"].execute(
                    f"用户问题：{user_message}\n检索最相关的景区知识。如需调用工具请在回复中指定 suggested_tool 和 tool_args。"
                )

                # 如果 KnowledgeAgent 建议调用工具，执行之
                if knowledge_result and "suggested_tool" in knowledge_result:
                    tool_name = knowledge_result["suggested_tool"]
                    tool_args = knowledge_result.get("tool_args", {})
                    yield AgentStep(
                        phase="act",
                        content=f"[KnowledgeAgent] 调用 {tool_name}",
                        detail={"tool": tool_name, "args": tool_args},
                    )
                    tool_result = await tool_registry.call(tool_name, tool_args)
                    results["knowledge"] = {
                        "tool": tool_name,
                        "result": tool_result.data if tool_result.success else str(tool_result.error),
                    }
                else:
                    results["knowledge"] = knowledge_result

                yield AgentStep(
                    phase="observe",
                    content=f"[KnowledgeAgent] 检索完成",
                    detail={"result_summary": str(results.get("knowledge", ""))[:150]},
                )

            elif step == "route":
                yield AgentStep(
                    phase="act",
                    content=f"[RouteAgent] 规划路线...",
                )
                route_result = await self.agents["route"].execute(
                    f"用户需求：{user_message}\n知识背景：{results.get('knowledge', {})}\n推荐最适合的游览路线。如需调用 recommend_route 工具请指定参数。"
                )

                if route_result and "suggested_tool" in route_result:
                    tool_name = route_result["suggested_tool"]
                    tool_args = route_result.get("tool_args", {})
                    yield AgentStep(
                        phase="act",
                        content=f"[RouteAgent] 调用 {tool_name}",
                        detail={"tool": tool_name, "args": tool_args},
                    )
                    tool_result = await tool_registry.call(tool_name, tool_args)
                    results["route"] = tool_result.data if tool_result.success else {"error": tool_result.error}
                else:
                    results["route"] = route_result

                yield AgentStep(
                    phase="observe",
                    content=f"[RouteAgent] 路线规划完成",
                )

        # ---- Phase 4: Content Agent 融合生成 ----
        yield AgentStep(
            phase="act",
            content="[ContentAgent] 生成讲解词...",
        )

        content_task = f"""请根据以下信息生成一段完整的导游讲解词：

用户问题：{user_message}
情绪策略：{emotion_data.get('strategy', '正常')}
检索信息：{json.dumps(results.get('knowledge', {}), ensure_ascii=False)[:800]}
路线信息：{json.dumps(results.get('route', {}), ensure_ascii=False)[:400]}

要求：
1. 用热情友好的导游语气
2. 基于真实数据，不编造
3. 如有路线推荐，清晰列出景点顺序和时间
4. 适当使用emoji
5. 如果是简单问题直接回答，不用强行推荐路线"""

        content_result = await self.agents["content"].execute(content_task)
        final_answer = content_result.get("result", "抱歉，暂时无法回答。") if content_result else "抱歉，AI服务暂不可用。"

        yield AgentStep(
            phase="observe",
            content="综合信息，生成最终回答",
            detail={
                "answer": final_answer,
                "emotion": emotion_data.get("emotion", "neutral"),
                "agents_used": [a for a in plan["steps"]] + ["content"],
                "total_ms": int((time.time() - t_start) * 1000),
            },
        )

    async def _create_plan(self, message: str, emotion: dict) -> Dict:
        """Orchestrator 制定执行计划"""
        if not llm_service.is_available:
            return {"steps": ["knowledge"], "reason": "默认单步查询"}

        prompt = f"""你是 Multi-Agent 系统的总协调器。为以下用户问题制定子 Agent 调度计划。

用户消息：{message}
用户情绪：{emotion.get('emotion', 'neutral')}

可选子 Agent：
- knowledge: 知识检索（景区信息、历史文化、景点详情）
- route: 路线规划（游览路线、时间安排、路径优化）
- emotion: 情感分析（已自动执行）
- content: 内容生成（最终讲解词，总是最后执行）

判断规则：
- 简单事实问题（"多高""多少钱""几点开门"）→ 只要 knowledge
- 路线规划问题（"推荐路线""怎么走""3小时"）→ knowledge + route
- 比较分析问题（"哪个好""有什么区别"）→ knowledge（多次检索）
- 天气+游览问题 → knowledge + route

输出JSON：{{"steps": ["knowledge", "route"], "reason": "..."}}"""
        try:
            r = llm_service.chat(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=150,
            )
            if r:
                import re
                m = re.search(r'\{.*\}', r, re.DOTALL)
                if m:
                    plan = json.loads(m.group(0))
                    # 确保 content 总是最后
                    if "content" in plan.get("steps", []):
                        plan["steps"].remove("content")
                    plan["steps"].append("content")
                    return plan
        except Exception:
            pass

        # 默认计划
        return {"steps": ["knowledge", "content"], "reason": "默认：知识检索 → 内容生成"}


# 全局单例
multi_agent = MultiAgentOrchestrator()
