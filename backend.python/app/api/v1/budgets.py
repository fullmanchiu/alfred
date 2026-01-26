"""预算管理API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.budget import Budget

router = APIRouter(prefix="/budgets", tags=["budgets"])


class BudgetCreate(BaseModel):
    category_id: int = Field(..., description="分类ID")
    amount: float = Field(..., gt=0, description="预算金额")
    period: str = Field("monthly", description="预算周期：monthly, yearly, weekly, daily")
    alert_threshold: float = Field(80.0, ge=0, le=100, description="预警阈值（百分比）")


class BudgetUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    alert_threshold: Optional[float] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None


@router.get("", summary="获取预算列表")
async def get_budgets(
    period: Optional[str] = Query(None, description="预算周期筛选"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的预算列表"""
    query = db.query(Budget).filter(Budget.user_id == current_user["id"])

    if period:
        query = query.filter(Budget.period == period)

    budgets = query.filter(Budget.is_active == True).all()

    budgets_data = []
    for b in budgets:
        budgets_data.append({
            "id": b.id,
            "category": {
                "id": b.category.id,
                "name": b.category.name,
                "icon": b.category.icon,
                "color": b.category.color
            },
            "amount": float(b.amount),
            "period": b.period,
            "alert_threshold": float(b.alert_threshold),
            "start_date": b.start_date.isoformat(),
            "end_date": b.end_date.isoformat() if b.end_date else None
        })

    return {"success": True, "data": budgets_data}


@router.post("", summary="创建预算")
async def create_budget(
    budget: BudgetCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新预算"""
    # 检查是否已存在相同分类和周期的预算
    existing = db.query(Budget).filter_by(
        user_id=current_user["id"],
        category_id=budget.category_id,
        period=budget.period,
        is_active=True
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="该分类已有相同周期的预算")

    # 设置开始日期为当前周期开始
    now = datetime.utcnow()
    if budget.period == "monthly":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif budget.period == "yearly":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = now

    new_budget = Budget(
        user_id=current_user["id"],
        category_id=budget.category_id,
        amount=budget.amount,
        period=budget.period,
        alert_threshold=budget.alert_threshold,
        start_date=start_date
    )

    db.add(new_budget)
    db.commit()

    return {
        "success": True,
        "data": {"id": new_budget.id},
        "message": "预算创建成功"
    }


@router.put("/{budget_id}", summary="更新预算")
async def update_budget(
    budget_id: int,
    budget: BudgetUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新预算信息"""
    db_budget = db.query(Budget).filter_by(
        id=budget_id,
        user_id=current_user["id"]
    ).first()

    if not db_budget:
        raise HTTPException(status_code=404, detail="预算不存在")

    update_data = budget.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_budget, field, value)

    db.commit()

    return {"success": True, "message": "预算更新成功"}


@router.delete("/{budget_id}", summary="删除预算")
async def delete_budget(
    budget_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除预算"""
    db_budget = db.query(Budget).filter_by(
        id=budget_id,
        user_id=current_user["id"]
    ).first()

    if not db_budget:
        raise HTTPException(status_code=404, detail="预算不存在")

    db_budget.is_active = False
    db.commit()

    return {"success": True, "message": "预算已删除"}
