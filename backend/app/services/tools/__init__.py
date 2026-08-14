"""
Agent 工具集
===========
每个工具是一个可被 Agent 调用的函数，遵循统一接口：
  - 接受明确的命名参数
  - 返回 str | dict（序列化为 LLM 可读文本）
  - 可以是同步或异步函数

工具在 register_all_tools() 中统一注册到全局 tool_registry。
"""
from app.services.agent_service import tool_registry
from app.services.tools.knowledge_search import search_knowledge
from app.services.tools.spot_detail import get_spot_detail, list_all_spots
from app.services.tools.route_planner import recommend_route
from app.services.tools.weather_check import check_weather
from app.services.tools.sentiment_analyzer import analyze_sentiment
from app.services.tools.graph_query import query_knowledge_graph
from app.services.tools.graph_rag_search import search_graph_rag
from app.services.tools.multimodal_tool import analyze_image


def register_all_tools():
    """注册所有工具到全局注册表"""

    # 1. 知识检索（核心工具）
    tool_registry.register(
        name="search_knowledge",
        fn=search_knowledge,
        schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "搜索关键词，用中文描述想查询的内容，如'灵山大佛的高度和历史'",
                },
                "top_k": {
                    "type": "integer",
                    "description": "返回结果数量，默认 3",
                },
            },
            "required": ["query"],
        },
        description="搜索景区知识库，获取景点介绍、历史文化、开放时间等信息。适用于任何关于灵山胜境的知识性问题。",
    )

    # 2. 景点详情查询
    tool_registry.register(
        name="get_spot_detail",
        fn=get_spot_detail,
        schema={
            "type": "object",
            "properties": {
                "spot_name": {
                    "type": "string",
                    "description": "景点名称，如'灵山大佛'、'九龙灌浴'、'灵山梵宫'",
                },
            },
            "required": ["spot_name"],
        },
        description="获取特定景点的详细信息，包括位置、文化内涵、游玩亮点、开放时间等结构化数据。",
    )

    # 3. 景点列表
    tool_registry.register(
        name="list_all_spots",
        fn=list_all_spots,
        schema={
            "type": "object",
            "properties": {
                "tag": {
                    "type": "string",
                    "description": "按标签筛选，可选值：佛教文化/历史古迹/自然风光/拍照打卡/亲子/祈福/演艺/美食/休闲",
                },
            },
            "required": [],
        },
        description="获取所有景点列表，可按标签筛选。用于了解景区有哪些景点、哪些适合特定人群。",
    )

    # 4. 路线推荐（核心工具）
    tool_registry.register(
        name="recommend_route",
        fn=recommend_route,
        schema={
            "type": "object",
            "properties": {
                "duration_hours": {
                    "type": "number",
                    "description": "游览时长（小时），如 2、3、5、8",
                },
                "interests": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "兴趣标签列表，如 ['佛教文化', '拍照打卡', '亲子']",
                },
                "companions": {
                    "type": "string",
                    "description": "同行人员类型：家庭/情侣/朋友/独行",
                },
                "energy_level": {
                    "type": "string",
                    "description": "体力水平：轻松/适中/充沛",
                },
            },
            "required": ["duration_hours"],
        },
        description="根据游客的可用时间、兴趣爱好、同行人员，推荐个性化的游览路线。返回路线中包含景点顺序、每个景点的停留时间和游玩提示。",
    )

    # 5. 天气查询
    tool_registry.register(
        name="check_weather",
        fn=check_weather,
        schema={
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名，如'无锡'",
                },
            },
            "required": ["city"],
        },
        description="查询指定城市的实时天气状况，包括温度、天气、风力、湿度等。用于回答'今天天气怎么样'、'适合出游吗'等问题。",
    )

    # 6. 情感分析
    tool_registry.register(
        name="analyze_sentiment",
        fn=analyze_sentiment,
        schema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "需要分析情感的文本",
                },
            },
            "required": ["text"],
        },
        description="分析文本的情感倾向。Agent 可用此工具感知用户情绪，调整回复策略。",
    )

    # 7. 知识图谱查询
    tool_registry.register(
        name="query_knowledge_graph",
        fn=query_knowledge_graph,
        schema={
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "用自然语言描述想从知识图谱中查询什么，如'灵山大佛附近有哪些景点'、'哪些景点属于唐代'、'灵山大佛由谁设计'",
                },
            },
            "required": ["question"],
        },
        description="查询景区知识图谱，获取景点间的邻近关系、路线关联、历史朝代、相关人物、文化概念等信息。适用于关联性问题，如'灵山大佛附近有什么'、'哪些景点是唐代的'、'谁建造了梵宫'等。",
    )

    # 8. GraphRAG 社区检索（2024最新范式）
    tool_registry.register(
        name="search_graph_rag",
        fn=search_graph_rag,
        schema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "自然语言查询，如'佛教核心景区有哪些'、'唐代遗迹相关的景点'、'亲子游主题区域'",
                },
            },
            "required": ["query"],
        },
        description="GraphRAG分层知识检索：先搜索主题社区摘要，再返回社区内所有关联实体。比普通搜索更有全局视野，适合'有哪些'、'整体介绍'类问题。",
    )

    # 9. 多模态图像分析
    tool_registry.register(
        name="analyze_image",
        fn=analyze_image,
        schema={
            "type": "object",
            "properties": {
                "image_base64": {
                    "type": "string",
                    "description": "图片的Base64编码（不含data URI前缀）",
                },
                "question": {
                    "type": "string",
                    "description": "关于图片的问题，如'这是什么景点'、'这里怎么走'",
                },
            },
            "required": ["image_base64"],
        },
        description="分析用户上传的景区照片，识别景点、讲解文化、提供路线引导。适用于游客拍照问路、实景识别等场景。",
    )

    print(f"[Agent] 已注册 {len(tool_registry._tools)} 个工具")
