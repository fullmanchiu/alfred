from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.health import HealthProfile

router = APIRouter(prefix="/health", tags=["health"])

class HealthProfileRequest(BaseModel):
    height: Optional[float] = Field(None, ge=0, description="身高(cm)")
    weight: Optional[float] = Field(None, ge=0, description="体重(kg)")
    body_fat: Optional[float] = Field(None, ge=0, le=100, description="体脂率(%)")
    muscle_rate: Optional[float] = Field(None, ge=0, le=100, description="肌肉率(%)")
    water_rate: Optional[float] = Field(None, ge=0, le=100, description="水分率(%)")
    bone_mass: Optional[float] = Field(None, ge=0, description="骨量(kg)")
    protein_rate: Optional[float] = Field(None, ge=0, le=100, description="蛋白质率(%)")
    bmr: Optional[int] = Field(None, ge=0, description="基础代谢(kcal)")
    visceral_fat: Optional[int] = Field(None, ge=0, description="内脏脂肪等级")
    bmi: Optional[float] = Field(None, description="体质指数")

class HealthProfileResponse(BaseModel):
    id: int
    height: Optional[float]
    weight: Optional[float]
    body_fat: Optional[float]
    muscle_rate: Optional[float]
    water_rate: Optional[float]
    bone_mass: Optional[float]
    protein_rate: Optional[float]
    bmr: Optional[int]
    visceral_fat: Optional[int]
    bmi: Optional[float]
    created_at: str

    class Config:
        from_attributes = True

@router.get("/profile", summary="获取最新的健康数据")
async def get_health_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 获取用户最新的健康数据记录
    health_profile = db.query(HealthProfile).filter_by(user_id=current_user["id"]).order_by(HealthProfile.created_at.desc()).first()
    if not health_profile:
        # 返回空的健康资料，而不是404
        return {"data": {}, "message": "健康数据不存在", "status": "success"}
    # 如果有健康资料，返回数据，转换datetime为字符串
    return {
        "data": {
            "id": health_profile.id,
            "height": health_profile.height,
            "weight": health_profile.weight,
            "body_fat": health_profile.body_fat,
            "muscle_rate": health_profile.muscle_rate,
            "water_rate": health_profile.water_rate,
            "bone_mass": health_profile.bone_mass,
            "protein_rate": health_profile.protein_rate,
            "bmr": health_profile.bmr,
            "visceral_fat": health_profile.visceral_fat,
            "bmi": health_profile.bmi,
            "created_at": health_profile.created_at.isoformat() if health_profile.created_at else None
        },
        "message": "获取健康数据成功",
        "status": "success"
    }

@router.post("/profile", summary="创建健康数据")
async def create_health_profile(
    request: HealthProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 计算BMI：体重(kg) / (身高(m) * 身高(m))
    bmi = None
    if request.height and request.weight:
        height_m = request.height / 100  # 转换为米
        bmi = round(request.weight / (height_m * height_m), 1)
    
    # 直接创建新的健康数据记录，不再检查是否已存在
    health_profile = HealthProfile(
        user_id=current_user["id"],
        height=request.height,
        weight=request.weight,
        body_fat=request.body_fat,
        muscle_rate=request.muscle_rate,
        water_rate=request.water_rate,
        bone_mass=request.bone_mass,
        protein_rate=request.protein_rate,
        bmr=request.bmr,
        visceral_fat=request.visceral_fat,
        bmi=bmi,  # 使用计算出的BMI值
    )
    
    db.add(health_profile)
    db.commit()
    db.refresh(health_profile)
    
    # 返回创建的数据，转换datetime为字符串
    return {
        "data": {
            "id": health_profile.id,
            "height": health_profile.height,
            "weight": health_profile.weight,
            "body_fat": health_profile.body_fat,
            "muscle_rate": health_profile.muscle_rate,
            "water_rate": health_profile.water_rate,
            "bone_mass": health_profile.bone_mass,
            "protein_rate": health_profile.protein_rate,
            "bmr": health_profile.bmr,
            "visceral_fat": health_profile.visceral_fat,
            "bmi": health_profile.bmi,
            "created_at": health_profile.created_at.isoformat() if health_profile.created_at else None
        }, 
        "message": "创建健康数据成功", 
        "status": "success"
    }

@router.put("/profile", summary="更新健康数据")
async def update_health_profile(
    request: HealthProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 获取用户最近一次有身高记录的数据
    last_record_with_height = db.query(HealthProfile).filter(
        HealthProfile.user_id == current_user["id"],
        HealthProfile.height.isnot(None)
    ).order_by(HealthProfile.created_at.desc()).first()

    # 使用历史身高或当前提交的身高
    height = request.height if request.height is not None else (last_record_with_height.height if last_record_with_height else None)

    # 计算BMI：体重(kg) / (身高(m) * 身高(m))
    bmi = None
    if height and request.weight:
        height_m = height / 100  # 转换为米
        bmi = round(request.weight / (height_m * height_m), 1)

    # 创建新的健康数据记录
    health_profile = HealthProfile(
        user_id=current_user["id"],
        height=height,  # 使用获取到的身高
        weight=request.weight,
        body_fat=request.body_fat,
        muscle_rate=request.muscle_rate,
        water_rate=request.water_rate,
        bone_mass=request.bone_mass,
        protein_rate=request.protein_rate,
        bmr=request.bmr,
        visceral_fat=request.visceral_fat,
        bmi=bmi,  # 使用计算出的BMI值
    )

    db.add(health_profile)
    db.commit()
    db.refresh(health_profile)

    # 返回新创建的数据，转换datetime为字符串
    return {
        "data": {
            "id": health_profile.id,
            "height": health_profile.height,
            "weight": health_profile.weight,
            "body_fat": health_profile.body_fat,
            "muscle_rate": health_profile.muscle_rate,
            "water_rate": health_profile.water_rate,
            "bone_mass": health_profile.bone_mass,
            "protein_rate": health_profile.protein_rate,
            "bmr": health_profile.bmr,
            "visceral_fat": health_profile.visceral_fat,
            "bmi": health_profile.bmi,
            "created_at": health_profile.created_at.isoformat() if health_profile.created_at else None
        },
        "message": "添加健康记录成功",
        "status": "success"
    }

@router.delete("/profile", summary="删除健康数据")
async def delete_health_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    health_profile = db.query(HealthProfile).filter_by(user_id=current_user["id"]).first()
    if not health_profile:
        return {"data": {}, "message": "健康数据不存在", "status": "error"}
    
    db.delete(health_profile)
    db.commit()
    
    return {"data": {}, "message": "健康数据已删除", "status": "success"}

@router.get("/history", summary="获取健康数据历史记录")
async def get_health_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 获取用户的所有健康数据记录，按时间倒序排列
    health_records = db.query(HealthProfile).filter_by(user_id=current_user["id"]).order_by(HealthProfile.created_at.desc()).all()
    # 转换datetime为字符串并返回
    history_data = []
    for record in health_records:
        history_data.append({
            "id": record.id,
            "height": record.height,
            "weight": record.weight,
            "body_fat": record.body_fat,
            "muscle_rate": record.muscle_rate,
            "water_rate": record.water_rate,
            "bone_mass": record.bone_mass,
            "protein_rate": record.protein_rate,
            "bmr": record.bmr,
            "visceral_fat": record.visceral_fat,
            "bmi": record.bmi,
            "created_at": record.created_at.isoformat() if record.created_at else None
        })
    return {"data": history_data, "message": "获取健康数据历史记录成功", "status": "success"}
