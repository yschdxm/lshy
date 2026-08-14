"""
游客反馈 API
POST /api/feedback — 保存反馈
GET  /api/feedback/stats — 反馈统计（管理后台用）
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.core.database import get_db
from app.models.feedback_report import FeedbackReport
from app.models.chat_record import ChatRecord

router = APIRouter(prefix="/api/feedback", tags=["游客反馈"])


class FeedbackRequest(BaseModel):
    session_id: str = Field(default="default", description="会话 ID")
    type: str = Field(default="like", description="反馈类型: like/dislike/suggestion/complaint")
    content: str = Field(default="", description="反馈内容")
    score: int = Field(default=5, ge=1, le=5, description="满意度评分 1-5")
    related_spot: str = Field(default="", description="关联景点")


@router.post("")
async def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    """提交游客反馈"""
    try:
        # 保存到反馈汇总表
        today = datetime.now().strftime("%Y-%m-%d")
        report = db.query(FeedbackReport).filter(
            FeedbackReport.report_date == today
        ).first()

        new_entry = {
            "type": req.type,
            "content": req.content,
            "score": req.score,
            "related_spot": req.related_spot,
            "session_id": req.session_id,
            "time": datetime.now().isoformat(),
        }

        if report:
            # 追加到今日报告
            try:
                existing = json.loads(report.service_suggestions or "[]")
            except json.JSONDecodeError:
                existing = []
            existing.append(new_entry)
            report.service_suggestions = json.dumps(existing, ensure_ascii=False)

            # 更新情感摘要
            try:
                emo = json.loads(report.emotion_summary or "{}")
            except json.JSONDecodeError:
                emo = {}
            emo[f"feedback_{len(existing)}"] = {
                "type": req.type, "score": req.score
            }
            report.emotion_summary = json.dumps(emo, ensure_ascii=False)
        else:
            # 创建今日报告
            report = FeedbackReport(
                report_date=today,
                total_sessions=1,
                hot_questions=json.dumps([], ensure_ascii=False),
                hot_spots=json.dumps([], ensure_ascii=False),
                emotion_summary=json.dumps({
                    "feedback_0": {"type": req.type, "score": req.score}
                }, ensure_ascii=False),
                service_suggestions=json.dumps([new_entry], ensure_ascii=False),
            )
            db.add(report)

        # 如果是 chat 反馈，更新对应记录的满意度
        if req.type in ("like", "dislike") and req.session_id:
            last_record = (
                db.query(ChatRecord)
                .filter(ChatRecord.session_id == req.session_id)
                .order_by(ChatRecord.created_at.desc())
                .first()
            )
            if last_record:
                last_record.satisfaction_score = (
                    5.0 if req.type == "like" else 1.0
                )

        db.commit()

        # 根据反馈类型返回感谢语
        if req.type == "complaint":
            response_msg = "感谢您的反馈，我们非常重视您的意见，会尽快改进。"
        elif req.type == "suggestion":
            response_msg = "谢谢您的建议！灵灵会把您的想法转达给景区管理团队。"
        else:
            response_msg = "感谢您的评价！灵灵会继续努力为您提供更好的导览服务。"

        return {
            "status": "ok",
            "message": response_msg,
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.get("/stats")
async def feedback_stats(db: Session = Depends(get_db)):
    """获取反馈统计数据"""
    today = datetime.now().strftime("%Y-%m-%d")
    report = db.query(FeedbackReport).filter(
        FeedbackReport.report_date == today
    ).first()

    if not report:
        return {"total_feedback": 0, "likes": 0, "dislikes": 0, "avg_score": 0}

    try:
        items = json.loads(report.service_suggestions or "[]")
    except json.JSONDecodeError:
        items = []

    likes = sum(1 for i in items if i.get("type") == "like")
    dislikes = sum(1 for i in items if i.get("type") == "dislike")
    avg = (
        round(sum(i.get("score", 5) for i in items) / len(items), 1)
        if items else 0
    )

    return {
        "total_feedback": len(items),
        "likes": likes,
        "dislikes": dislikes,
        "avg_score": avg,
        "recent": items[-5:] if items else [],
    }
