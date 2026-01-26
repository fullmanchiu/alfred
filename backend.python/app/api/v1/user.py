from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.user import User as UserModel
from passlib.hash import bcrypt

router = APIRouter(prefix="/user", tags=["user"])

class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = Field(None, description="昵称")
    phone: Optional[str] = Field(None, description="手机号")
    email: Optional[str] = Field(None, description="邮箱")
    location: Optional[str] = Field(None, description="所在地")
    gender: Optional[str] = Field(None, description="性别")

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=6, description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码")

@router.get("/profile", summary="获取用户资料")
async def get_profile(current_user: Dict = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    u = db.query(UserModel).filter_by(id=current_user["id"]).first()
    if not u:
        # 鉴权已通过但本地无档案，懒创建
        u = UserModel(
            id=current_user["id"],
            username=current_user["username"],
            password_hash="*",
            nickname=current_user.get("nickname") or current_user["username"],
            email=current_user.get("email"),
        )
        db.add(u); db.commit(); db.refresh(u)
    return {
        "id": u.id, "username": u.username, "nickname": u.nickname,
        "phone": u.phone, "email": u.email, "location": u.location,
        "gender": u.gender,
        "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
    }

@router.put("/profile", summary="更新用户资料")
async def update_profile(request: UpdateProfileRequest,
                         current_user: Dict = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    u = db.query(UserModel).filter_by(id=current_user["id"]).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")
    data = request.model_dump()
    for k, v in data.items():
        if v is not None:
            setattr(u, k, v)
    db.commit()
    return {"success": True, "message": "更新成功"}

@router.post("/password", summary="修改密码")
async def change_password(request: ChangePasswordRequest,
                          current_user: Dict = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    u = db.query(UserModel).filter_by(id=current_user["id"]).first()
    if not u:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="用户不存在")

    if not u.password_hash or not bcrypt.verify(request.current_password, u.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前密码不正确")

    u.password_hash = bcrypt.hash(request.new_password)
    db.commit()
    return {"success": True, "message": "密码已更新"}
