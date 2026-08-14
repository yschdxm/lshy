"""
JWT 认证依赖注入
从 Authorization: Bearer <token> 中解析 user_id，注入到路由参数
"""
from fastapi import Header, HTTPException
from typing import Optional
from app.services.auth_service import decode_token


def get_current_user_id(authorization: Optional[str] = Header(None, alias="Authorization")) -> int:
    """
    从请求头中解析 JWT，返回 user_id。
    未登录时返回 0（兼容匿名访问，但不会关联用户数据）。
    """
    if not authorization:
        return 0
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            return 0
    except ValueError:
        return 0

    payload = decode_token(token)
    if not payload:
        return 0
    return payload.get("user_id", 0)
