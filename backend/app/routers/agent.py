"""
Agent 对话接口 — SSE 流式输出
===============================
POST /api/agent/chat          — Agent 多步推理（SSE 流式）
GET  /api/agent/tools         — 可用工具列表
POST /api/agent/chat/stream   — 同上（别名）

答辩要点：通过 SSE 将 Agent 的 Think→Plan→Act→Observe 每一步
实时推送给前端，让用户看到 AI "思考"的过程，而非黑盒等待。
"""
import json
import time
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.core.auth_dep import get_current_user_id
from app.models.chat_record import ChatRecord
from app.services.agent_service import agent_loop, tool_registry, route_intent
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent", tags=["Agent 对话"])


class AgentChatRequest(BaseModel):
    """Agent 对话请求"""
    session_id: str = Field(default="demo", description="会话 ID")
    message: str = Field(..., min_length=1, max_length=2000, description="用户消息")
    history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="历史对话 [{\"role\":\"user/assistant\",\"content\":\"...\"}]",
    )


@router.post("/chat")
async def agent_chat(req: AgentChatRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """
    Agent 智能对话（SSE 流式）

    前端通过 EventSource 或 fetch + ReadableStream 接收事件：
      event: think     → Agent 开始推理
      event: plan      → Agent 决定调用工具
      event: act       → Agent 执行工具
      event: observe   → Agent 分析工具结果
      event: answer    → 最终回答（流式输出文本）
      event: done      → 对话结束，含元数据
      event: error     → 错误信息
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    async def event_stream():
        t_start = time.time()
        final_answer = ""
        final_emotion = "neutral"
        tool_count = 0
        iteration_count = 0

        try:
            async for step in agent_loop.run(
                user_message=req.message,
                history=req.history,
                session_id=req.session_id,
            ):
                # 根据 phase 发送不同事件
                event_data = {
                    "phase": step.phase,
                    "content": step.content,
                    "duration_ms": step.duration_ms,
                }

                if step.detail:
                    event_data["detail"] = step.detail

                # 最终回答用专门的 answer 事件
                if step.phase == "observe" and step.detail and "answer" in step.detail:
                    final_answer = step.detail.get("answer", "")
                    final_emotion = step.detail.get("emotion", "neutral")
                    iteration_count = step.detail.get("total_iterations", 0)
                    tool_count = step.detail.get("total_tools", 0)

                    yield f"event: answer\ndata: {json.dumps({'answer': final_answer, 'emotion': final_emotion}, ensure_ascii=False)}\n\n"
                else:
                    yield f"event: {step.phase}\ndata: {json.dumps(event_data, ensure_ascii=False)}\n\n"

            # 更新记忆系统
            try:
                from app.services.memory_service import profile_manager, conversation_memory
                profile_manager.update_from_conversation(req.session_id, req.message, final_answer)
                conversation_memory.add(req.session_id, req.message, final_answer)
            except Exception:
                pass

            # 保存对话记录
            total_ms = int((time.time() - t_start) * 1000)
            record_id = 0
            try:
                chat_record = ChatRecord(
                    session_id=req.session_id or "demo",
                    user_id=user_id if user_id else None,
                    user_message=req.message,
                    answer=final_answer,
                    intent=rag_service._detect_intent(req.message),
                    emotion=final_emotion,
                    response_time_ms=total_ms,
                )
                db.add(chat_record)
                db.commit()
                db.refresh(chat_record)
                record_id = chat_record.id
            except Exception as e:
                logger.warning(f"保存对话记录失败: {e}")

            # 发送完成事件（含record_id供前端评分）
            yield f"event: done\ndata: {json.dumps({'status': 'ok', 'total_ms': total_ms, 'iterations': iteration_count, 'tools_called': tool_count, 'emotion': final_emotion, 'record_id': record_id}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"Agent 对话异常: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
        },
    )


@router.post("/rebuild-graph-rag")
async def rebuild_graph_rag():
    """构建/重建 GraphRAG 社区摘要索引"""
    from app.services.graph_rag_service import graph_rag_service
    try:
        result = graph_rag_service.build()
        return result
    except Exception as e:
        logger.error(f"GraphRAG 构建失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph-rag-stats")
async def graph_rag_stats():
    """获取 GraphRAG 索引统计"""
    from app.services.graph_rag_service import graph_rag_service
    return graph_rag_service.get_stats()


@router.get("/graph-visualize")
async def graph_visualize(query: str = ""):
    """返回知识图谱子图数据供前端可视化"""
    from neo4j import GraphDatabase
    from app.core.config import settings
    try:
        driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Neo4j 驱动初始化失败: {e}")
    try:
        with driver.session() as s:
            if query:
                result = s.run("""
                    MATCH (a)-[r]->(b)
                    WHERE a.name CONTAINS $q OR b.name CONTAINS $q
                    RETURN a.name as src, labels(a)[0] as stype,
                           b.name as tgt, labels(b)[0] as ttype,
                           type(r) as rel, r.dist_m as dist
                    LIMIT 80
                """, q=query)
            else:
                result = s.run("""
                    MATCH (a)-[r]->(b)
                    RETURN a.name as src, labels(a)[0] as stype,
                           b.name as tgt, labels(b)[0] as ttype,
                           type(r) as rel, r.dist_m as dist
                    LIMIT 50
                """)
            nodes, edges = {}, []
            for row in result:
                src, tgt = row["src"], row["tgt"]
                if src not in nodes:
                    nodes[src] = {"name": src, "type": row["stype"]}
                if tgt not in nodes:
                    nodes[tgt] = {"name": tgt, "type": row["ttype"]}
                edges.append({"source": src, "target": tgt, "relation": row["rel"], "distance": row.get("dist")})
            return {"nodes": list(nodes.values()), "edges": edges, "count": len(nodes)}
    except HTTPException:
        raise
    except Exception as e:
        # 直接暴露 Neo4j 连接/查询的真实错误（连接拒绝、认证失败等），
        # 走 HTTPException 还能让响应带上 CORS 头，避免浏览器误报 CORS
        raise HTTPException(status_code=503, detail=f"Neo4j 不可用({settings.neo4j_uri}): {type(e).__name__}: {e}")
    finally:
        driver.close()


@router.post("/chat/multi-agent")
async def multi_agent_chat(req: AgentChatRequest, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """
    Multi-Agent 协作对话（SSE 流式）

    4个专业化子 Agent 协作：
    EmotionAgent → Orchestrator → KnowledgeAgent/RouteAgent → ContentAgent
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    from app.services.multi_agent_service import multi_agent

    async def event_stream():
        t_start = time.time()
        final_answer = ""

        try:
            async for step in multi_agent.run(
                user_message=req.message,
                session_id=req.session_id,
            ):
                event_data = {
                    "phase": step.phase,
                    "content": step.content,
                    "duration_ms": step.duration_ms,
                }
                if step.detail:
                    event_data["detail"] = step.detail

                if step.phase == "observe" and step.detail and "answer" in step.detail:
                    final_answer = step.detail.get("answer", "")
                    yield f"event: answer\ndata: {json.dumps({'answer': final_answer}, ensure_ascii=False)}\n\n"
                else:
                    yield f"event: {step.phase}\ndata: {json.dumps(event_data, ensure_ascii=False)}\n\n"

            total_ms = int((time.time() - t_start) * 1000)
            yield f"event: done\ndata: {json.dumps({'status': 'ok', 'total_ms': total_ms, 'mode': 'multi-agent'}, ensure_ascii=False)}\n\n"

            # 保存记录
            try:
                chat_record = ChatRecord(
                    session_id=req.session_id or "demo",
                    user_id=user_id if user_id else None,
                    user_message=req.message,
                    answer=final_answer,
                    intent=rag_service._detect_intent(req.message),
                    response_time_ms=total_ms,
                )
                db.add(chat_record)
                db.commit()
            except Exception:
                pass
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/tools")
async def list_tools():
    """获取 Agent 可用工具列表"""
    return {
        "tools": tool_registry.get_tool_list(),
        "total": len(tool_registry._tools),
    }


# ================================================================
# 智能路由端点（集成到 /api/ai/chat 的替代方案）
# ================================================================

class SmartChatRequest(BaseModel):
    """智能路由对话请求"""
    session_id: str = Field(default="demo")
    message: str = Field(..., min_length=1, max_length=2000)
    mode: str = Field(default="qa")
    history: Optional[List[Dict[str, str]]] = None
    force_agent: bool = Field(default=False, description="强制使用 Agent 路径")


@router.post("/chat/smart")
async def smart_chat(req: SmartChatRequest, db: Session = Depends(get_db)):
    """
    智能路由对话：自动判断走 Fast（RAG）还是 Agent 路径

    这是对原有 /api/ai/chat 的升级版，前端只需切换端点即可获得 Agent 能力。
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 意图路由判断
    path = route_intent(req.message)
    if req.force_agent:
        path = "agent"

    # Fast 路径：直接 RAG（使用原有逻辑，同步返回）
    if path == "fast":
        from app.services.rag_service import rag_service

        t0 = time.time()
        result = rag_service.answer_with_rag(
            query=req.message,
            mode=req.mode,
            session_id=req.session_id,
        )

        # 保存记录
        try:
            sources_json = json.dumps(
                [s.get("title", "") for s in result.get("sources", [])],
                ensure_ascii=False,
            )
            chat_record = ChatRecord(
                session_id=req.session_id or "demo",
                user_message=req.message,
                answer=result["answer"],
                intent=result.get("intent", ""),
                emotion=result.get("emotion", "中性"),
                related_spots=sources_json if sources_json != "[]" else None,
                response_time_ms=result.get("response_time_ms", 0),
            )
            db.add(chat_record)
            db.commit()
        except Exception as e:
            logger.warning(f"保存记录失败: {e}")

        return {
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "intent": result.get("intent", ""),
            "emotion": result.get("emotion", "中性"),
            "response_time_ms": result.get("response_time_ms", 0),
            "path": "fast",
        }

    # Agent 路径：流式输出
    async def agent_stream():
        t_start = time.time()
        final_answer = ""

        try:
            async for step in agent_loop.run(
                user_message=req.message,
                history=req.history,
                session_id=req.session_id,
            ):
                event_data = {
                    "phase": step.phase,
                    "content": step.content,
                    "duration_ms": step.duration_ms,
                }
                if step.detail:
                    event_data["detail"] = step.detail

                if step.phase == "observe" and step.detail and "answer" in step.detail:
                    final_answer = step.detail.get("answer", "")

                yield f"event: {step.phase}\ndata: {json.dumps(event_data, ensure_ascii=False)}\n\n"

            total_ms = int((time.time() - t_start) * 1000)
            yield f"event: done\ndata: {json.dumps({'status': 'ok', 'total_ms': total_ms, 'path': 'agent'}, ensure_ascii=False)}\n\n"

            # 保存记录
            try:
                chat_record = ChatRecord(
                    session_id=req.session_id or "demo",
                    user_id=user_id if user_id else None,
                    user_message=req.message,
                    answer=final_answer,
                    intent=rag_service._detect_intent(req.message),
                    response_time_ms=total_ms,
                )
                db.add(chat_record)
                db.commit()
            except Exception:
                pass

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        agent_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
