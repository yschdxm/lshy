"""
认证路由：游客/管理员登录与注册
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.auth_dep import get_current_user_id
from app.models.user import User
from app.schemas.auth import TouristLoginRequest, AdminLoginRequest, AdminRegisterRequest
from app.services.auth_service import hash_password, verify_password, create_token
from app.routers.admin_api import write_audit_log

router = APIRouter(prefix="/api/auth", tags=["认证"])

# 调试用账号记录文件
DEBUG_ACCOUNT_FILE = r"D:\XCWsproject\软件杯\账号信息.txt"


def _log_account(user: User, raw_password: str):
    """仅在新注册时将账号信息写入调试文件"""
    try:
        role_label = "管理者" if user.role == "admin" else "旅游者"
        line = f"{role_label} | 账户: {user.username} | 密码: {raw_password}\n"
        with open(DEBUG_ACCOUNT_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass  # 调试日志，不影响登录流程


def _new_user_defaults():
    """新用户默认字段"""
    return {"is_active": "启用", "department": ""}


def _user_response(user: User) -> dict:
    """组装用户响应"""
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "nickname": user.nickname or "",
        "gender": user.gender or "",
        "age_group": user.age_group or "",
        "region": user.region or "",
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


# ============================================================
# 游客登录 / 自动注册
# ============================================================
@router.post("/login-tourist")
async def login_tourist(data: TouristLoginRequest, db: Session = Depends(get_db)):
    """
    游客登录：手机号 + 密码
    首次登录自动注册，支持补充个人信息
    """
    phone = data.phone.strip()
    password = data.password.strip()

    user = db.query(User).filter(User.username == phone, User.role == "tourist").first()

    if not user:
        # 自动注册 + 收集游客画像信息
        nickname = data.nickname or f"游客{phone[-4:]}"
        user = User(
            username=phone,
            password_hash=hash_password(password),
            role="tourist",
            nickname=nickname,
            gender=data.gender or "",
            age_group=data.age_group or "",
            region=data.region or "",
            **_new_user_defaults(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        _log_account(user, password)
    else:
        if not verify_password(password, user.password_hash):
            raise HTTPException(401, "密码错误")
        # 如果以前没填画像信息，这次可以补填
        updated = False
        for field in ["nickname", "gender", "age_group", "region"]:
            val = getattr(data, field, None)
            if val and not getattr(user, field):
                setattr(user, field, val)
                updated = True
        if updated:
            db.commit()
            db.refresh(user)

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_token(user.id, user.role, user.username)
    return {"token": token, "user": _user_response(user)}


# ============================================================
# 管理员登录
# ============================================================
@router.post("/login-admin")
async def login_admin(data: AdminLoginRequest, db: Session = Depends(get_db)):
    """
    管理员登录：账号 + 密码
    """
    account = data.account.strip()
    password = data.password.strip()

    user = db.query(User).filter(User.username == account, User.role == "admin").first()
    if not user:
        write_audit_log(account, "登录", "错误", f"登录失败：账号不存在", "—")
        raise HTTPException(401, "账号不存在")
    if not verify_password(password, user.password_hash):
        write_audit_log(account, "登录", "错误", f"登录失败：密码错误", "—")
        raise HTTPException(401, "密码错误")

    user.last_login = datetime.utcnow()
    db.commit()

    write_audit_log(account, "登录", "信息", "登录后台管理系统", "—")
    token = create_token(user.id, user.role, user.username)
    return {"token": token, "user": _user_response(user)}


# ============================================================
# 管理员注册
# ============================================================
@router.post("/register-admin")
async def register_admin(data: AdminRegisterRequest, db: Session = Depends(get_db)):
    """
    管理员注册：账号 + 密码 + 邀请码
    """
    account = data.account.strip()
    password = data.password.strip()
    invite_code = data.invite_code.strip()

    if invite_code != "LINGSHAN2025":
        raise HTTPException(400, "邀请码错误")

    existing = db.query(User).filter(User.username == account, User.role == "admin").first()
    if existing:
        raise HTTPException(409, "该账号已注册")

    user = User(
        username=account,
        password_hash=hash_password(password),
        role="admin",
        nickname=account,
        **_new_user_defaults(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _log_account(user, password)

    token = create_token(user.id, user.role, user.username)
    return {"token": token, "user": _user_response(user)}


# ============================================================
# 注销账号
# ============================================================
@router.delete("/delete-account")
async def delete_account(data: dict, db: Session = Depends(get_db)):
    """注销账号：验证身份后删除用户"""
    user_id = data.get("user_id")
    password = data.get("password", "")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if not verify_password(password, user.password_hash):
        raise HTTPException(401, "密码错误")

    db.delete(user)
    db.commit()
    return {"status": "ok", "message": "账号已注销"}


# ============================================================
# 更新个人信息
# ============================================================
from pydantic import BaseModel as PydanticBase

class ProfileUpdateRequest(PydanticBase):
    nickname: str = ""
    gender: str = ""
    age_group: str = ""
    region: str = ""

@router.put("/profile")
async def update_profile(
    data: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """更新游客个人信息"""
    if not user_id:
        raise HTTPException(401, "请先登录")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if data.nickname:
        user.nickname = data.nickname
    user.gender = data.gender
    user.age_group = data.age_group
    user.region = data.region
    db.commit()
    db.refresh(user)
    return {"status": "ok", "user": _user_response(user)}


# ============================================================
# 游客画像统计（供数据大屏用）
# ============================================================
@router.get("/tourist-stats")
async def tourist_stats(db: Session = Depends(get_db)):
    """游客人口统计数据：性别、年龄、地域分布"""
    tourists = db.query(User).filter(User.role == "tourist").all()

    # 性别分布
    gender_dist = {"男": 0, "女": 0, "其他": 0}
    # 年龄分布
    age_dist = {"18岁以下": 0, "18-30岁": 0, "31-45岁": 0, "46-60岁": 0, "60岁以上": 0}
    # 地域分布
    region_dist: dict = {}
    # 总游客数
    total = len(tourists)

    for u in tourists:
        g = u.gender or "其他"
        gender_dist[g] = gender_dist.get(g, 0) + 1

        a = u.age_group or "18-30岁"
        age_dist[a] = age_dist.get(a, 0) + 1

        r = u.region or "未知"
        region_dist[r] = region_dist.get(r, 0) + 1

    return {
        "total": total,
        "gender": [{"name": k, "value": v} for k, v in gender_dist.items()],
        "age": [{"name": k, "value": v} for k, v in age_dist.items()],
        "region": [{"name": k, "value": v} for k, v in sorted(region_dist.items(), key=lambda x: -x[1])],
    }


# ============================================================
# 种子管理员账号（供演示用）
# ============================================================
def seed_admin(db: Session):
    """确保至少有一个管理员账号"""
    admin = db.query(User).filter(User.username == "admin", User.role == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            role="admin",
            nickname="系统管理员",
            is_active="启用",
            department="运营中心",
        )
        db.add(admin)
        db.commit()
