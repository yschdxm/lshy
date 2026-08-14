"""
认证请求 Schema
"""
from typing import Optional
from pydantic import BaseModel, Field


class TouristLoginRequest(BaseModel):
    phone: str = Field(..., min_length=1, description="手机号")
    password: str = Field(..., min_length=6, description="密码")
    nickname: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    region: Optional[str] = None


class AdminLoginRequest(BaseModel):
    account: str = Field(..., min_length=1, description="管理员账号")
    password: str = Field(..., min_length=1, description="密码")


class AdminRegisterRequest(BaseModel):
    account: str = Field(..., min_length=3, description="管理员账号")
    password: str = Field(..., min_length=6, description="密码")
    invite_code: str = Field(..., min_length=1, description="邀请码")
