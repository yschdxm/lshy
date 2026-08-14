"""
数字人配置 CRUD 接口
答辩要点：支持多套数字人形象配置和启用切换
"""
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.digital_human_config import DigitalHumanConfig
from app.schemas.digital_human_config import (
    DigitalHumanConfigCreate,
    DigitalHumanConfigUpdate,
    DigitalHumanConfigResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/digital-human", tags=["数字人配置"])

# 形象照上传目录（默认 <仓库根目录>/frontend/public/avatars，可用环境变量 UPLOAD_DIR 覆盖）
_DEFAULT_UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "avatars")
)
UPLOAD_DIR = settings.upload_dir or _DEFAULT_UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=PaginatedResponse[DigitalHumanConfigResponse])
async def list_configs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    db: Session = Depends(get_db),
):
    """获取数字人配置列表"""
    query = db.query(DigitalHumanConfig)

    if is_active is not None:
        query = query.filter(DigitalHumanConfig.is_active == is_active)

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[DigitalHumanConfigResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/active", response_model=DigitalHumanConfigResponse)
async def get_active_config(db: Session = Depends(get_db)):
    """获取当前启用的数字人配置 — 供游客端直接调用"""
    config = db.query(DigitalHumanConfig).filter(DigitalHumanConfig.is_active == True).first()
    if not config:
        raise HTTPException(status_code=404, detail="当前没有启用的数字人配置")
    return DigitalHumanConfigResponse.model_validate(config)


@router.get("/{config_id}", response_model=DigitalHumanConfigResponse)
async def get_config(config_id: int, db: Session = Depends(get_db)):
    """获取单个数字人配置详情"""
    config = db.query(DigitalHumanConfig).filter(DigitalHumanConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="数字人配置不存在")
    return DigitalHumanConfigResponse.model_validate(config)


@router.post("", response_model=DigitalHumanConfigResponse, status_code=201)
async def create_config(data: DigitalHumanConfigCreate, db: Session = Depends(get_db)):
    """创建数字人配置"""
    config = DigitalHumanConfig(**data.model_dump())
    db.add(config)
    db.commit()
    db.refresh(config)
    return DigitalHumanConfigResponse.model_validate(config)


@router.put("/{config_id}", response_model=DigitalHumanConfigResponse)
async def update_config(
    config_id: int,
    data: DigitalHumanConfigUpdate,
    db: Session = Depends(get_db),
):
    """更新数字人配置"""
    config = db.query(DigitalHumanConfig).filter(DigitalHumanConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="数字人配置不存在")

    update_data = data.model_dump(exclude_unset=True)
    # 如果设置为启用，先将其它配置设为禁用（保证同一时间只有一个启用）
    if update_data.get("is_active"):
        db.query(DigitalHumanConfig).filter(
            DigitalHumanConfig.id != config_id
        ).update({"is_active": False})

    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return DigitalHumanConfigResponse.model_validate(config)


@router.post("/generate-persona")
async def generate_persona():
    """
    调用大模型生成灵山胜境特色数字人人设
    答辩要点：AI 自动生成符合景区文化的人设，不是手工填写
    """
    from app.services.llm_service import llm_service

    prompt = """你是一位资深的景区品牌策划专家。请为无锡灵山胜境（5A级佛教文化景区）设计一位AI数字人导览员的人设。

要求：
1. 人设要契合灵山胜境的佛教文化、禅意、亲和力
2. 名字要有文化底蕴，2-3个字
3. 性格设定要温暖、专业、有禅意
4. 口头禅要朗朗上口，有景区特色
5. 导览风格要有画面感
6. 服务边界要明确（只回答景区相关问题）

请按以下格式输出（JSON格式）：
{
  "name": "数字人名称",
  "personality": "性格描述（30字以内）",
  "catchphrase": "口头禅（15字以内）",
  "style": "导览风格描述（40字以内）",
  "boundary": "服务边界（30字以内）",
  "greeting": "欢迎语（50字以内）"
}

只输出JSON，不要其他文字。"""

    if not llm_service.is_available:
        # 降级：返回预置人设
        return {
            "name": "灵慧",
            "personality": "温润如玉的禅意导师，博学且善解人意",
            "catchphrase": "一花一世界，一步一灵山",
            "style": "娓娓道来，将佛学智慧融入山水之间",
            "boundary": "专注灵山胜境导览，不涉及宗教争议",
            "greeting": "缘起灵山，我是您的AI导览员灵慧。愿以清风为伴，与您共赴一场心灵之旅。",
        }

    result = llm_service.chat(
        [{"role": "user", "content": prompt}],
        temperature=0.9, max_tokens=400
    )
    if not result:
        raise HTTPException(status_code=500, detail="生成失败，请稍后重试")

    # 清理可能的 markdown 代码块
    result = result.strip()
    if result.startswith("```"):
        result = result.split("\n", 1)[-1]
        if result.endswith("```"):
            result = result[:-3]

    import json as _json
    try:
        data = _json.loads(result)
        return data
    except _json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"生成内容格式异常: {result[:100]}")


@router.post("/upload-avatar")
async def upload_avatar(file: UploadFile = File(...)):
    """上传数字人形象照 → 返回可访问的 URL"""
    allowed = {'.png','.jpg','.jpeg','.gif','.webp'}
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"不支持的文件格式: {ext}，请上传 {', '.join(allowed)}")
    import uuid
    filename = f"avatar_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"url": f"/avatars/{filename}", "filename": filename}


@router.delete("/{config_id}")
async def delete_config(config_id: int, db: Session = Depends(get_db)):
    """删除数字人配置"""
    config = db.query(DigitalHumanConfig).filter(DigitalHumanConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="数字人配置不存在")
    db.delete(config)
    db.commit()
    return {"status": "ok"}


# ============================================================
# 讯飞数字人 WebSocket 签名（apiSecret 仅存服务端）
# ============================================================

@router.get("/xfyun-auth")
async def xfyun_auth():
    """
    生成讯飞数字人 WebSocket 的临时签名 URL（约 5 分钟有效）
    前端拿到签名 URL 后直接连接，无需接触 apiSecret
    """
    import base64
    import hashlib
    import hmac
    from email.utils import formatdate
    from urllib.parse import urlencode, urlparse

    from app.core.config import settings

    if not (settings.xfyun_api_key and settings.xfyun_api_secret):
        raise HTTPException(status_code=503, detail="讯飞数字人服务未配置")

    parsed = urlparse(settings.xfyun_server_url)
    host = parsed.netloc
    path = parsed.path

    # RFC1123 英文格式（与前端 SDK 的 Date.toUTCString() 一致，且不受系统区域设置影响）
    date = formatdate(usegmt=True)
    signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"
    signature = base64.b64encode(
        hmac.new(
            settings.xfyun_api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")

    authorization_origin = (
        f'api_key="{settings.xfyun_api_key}", algorithm="hmac-sha256", '
        f'headers="host date request-line", signature="{signature}"'
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

    signed_url = f"{settings.xfyun_server_url}?{urlencode({'authorization': authorization, 'date': date, 'host': host})}"

    return {
        "server_url": signed_url,
        "app_id": settings.xfyun_app_id,
        "scene_id": settings.xfyun_scene_id,
    }
