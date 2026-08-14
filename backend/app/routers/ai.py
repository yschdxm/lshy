"""
AI 对话接口
POST /api/ai/chat            — RAG 问答（含记录保存）
POST /api/ai/rebuild-index   — 重建向量库
GET  /api/ai/history         — 获取历史记录（按 user_id 或 session_id）
PATCH /api/ai/feedback/{id}  — 游客满意度评分
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth_dep import get_current_user_id
from app.models.chat_record import ChatRecord
from app.schemas.ai import ChatRequest, ChatResponse, RebuildResponse
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI 对话"])


@router.post("/rebuild-index", response_model=RebuildResponse)
async def rebuild_index():
    """重建向量知识库索引"""
    try:
        result = rag_service.rebuild_vector_store()
        return RebuildResponse(**result)
    except Exception as e:
        logger.error(f"重建索引失败: {e}")
        raise HTTPException(status_code=500, detail=f"重建索引失败: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """
    AI 对话接口
    检索 → LLM 回答 → 保存记录（带 user_id）→ 返回
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    try:
        result = rag_service.answer_with_rag(
            query=req.message,
            mode=req.mode,
            session_id=req.session_id,
        )

        # 保存对话记录
        sources_json = json.dumps(
            [s.get("title", "") for s in result.get("sources", [])],
            ensure_ascii=False,
        )
        chat_record = ChatRecord(
            session_id=req.session_id or "default",
            user_id=user_id if user_id else None,
            user_message=req.message,
            answer=result["answer"],
            intent=result.get("intent", ""),
            emotion=result.get("emotion", "中性"),
            related_spots=sources_json if sources_json != "[]" else None,
            response_time_ms=result.get("response_time_ms", 0),
            satisfaction_score=None,
        )
        db.add(chat_record)
        db.commit()

        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"AI 对话失败: {e}")
        raise HTTPException(status_code=500, detail=f"对话服务异常: {str(e)}")


@router.get("/history")
async def get_history(
    session_id: Optional[str] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """获取历史对话记录：已登录按 user_id 查，否则按 session_id 查"""
    query = db.query(ChatRecord)
    if user_id:
        query = query.filter(ChatRecord.user_id == user_id)
    else:
        query = query.filter(ChatRecord.session_id == (session_id or "default"))
    records = (
        query.order_by(ChatRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "user_message": r.user_message,
                "answer": r.answer,
                "intent": r.intent,
                "emotion": r.emotion,
                "related_spots": r.related_spots,
                "response_time_ms": r.response_time_ms,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in reversed(records)
        ]
    }


@router.patch("/feedback/{record_id}")
async def submit_feedback(record_id: int, score: int = Query(ge=1, le=5), db: Session = Depends(get_db)):
    """游客对AI回答评分：1-5分"""
    record = db.query(ChatRecord).filter(ChatRecord.id == record_id).first()
    if not record:
        raise HTTPException(404, "记录不存在")
    record.satisfaction_score = float(score)
    db.commit()
    return {"status": "ok", "record_id": record_id, "satisfaction_score": score}


# ============================================================
# 衍生问题推荐（密钥仅存服务端，前端不再直连 LLM）
# ============================================================

class FollowUpRequest(BaseModel):
    question: str = Field(..., max_length=500, description="用户刚才的问题")
    answer: str = Field(..., max_length=2000, description="AI 的回答")


@router.post("/follow-ups")
async def generate_follow_ups(req: FollowUpRequest):
    """基于当前问答生成 3 个用户可能想问的后续问题"""
    from app.services.llm_service import llm_service

    if not llm_service.is_available:
        return {"questions": []}

    prompt = (
        f'用户刚刚问了："{req.question}"，AI回答："{req.answer[:300]}"。'
        '请基于以上对话生成3个用户可能接下来想问的问题。'
        '只输出JSON数组，如["问题1","问题2","问题3"]，不要其他内容。'
    )
    text = llm_service.chat(
        [{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    if not text:
        return {"questions": []}

    import re
    m = re.search(r"\[.*\]", text, re.S)
    if not m:
        return {"questions": []}
    try:
        questions = json.loads(m.group(0))
        if isinstance(questions, list):
            return {"questions": [str(q) for q in questions[:4]]}
    except (json.JSONDecodeError, TypeError):
        pass
    return {"questions": []}
