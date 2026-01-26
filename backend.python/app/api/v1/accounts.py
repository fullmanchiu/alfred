"""账户管理API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.account import Account

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="账户名称")
    account_type: str = Field(..., description="账户类型：bank_card, cash, alipay, wechat, credit_card")
    account_number: Optional[str] = Field(None, description="账号（可选）")
    initial_balance: float = Field(0.0, description="初始余额")
    currency: str = Field("CNY", description="货币类型")
    icon: Optional[str] = Field(None, description="图标标识")
    color: Optional[str] = Field(None, description="颜色代码")
    notes: Optional[str] = Field(None, description="备注")
    is_default: bool = Field(False, description="是否为默认账户")


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_number: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    notes: Optional[str] = None


@router.get("", summary="获取账户列表")
async def get_accounts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的所有账户，包括余额统计"""
    accounts = db.query(Account).filter(
        Account.user_id == current_user["id"],
        Account.is_active == True
    ).order_by(Account.is_default.desc(), Account.created_at).all()

    total_balance = sum(float(acc.balance or 0) for acc in accounts)

    return {
        "success": True,
        "data": {
            "accounts": [
                {
                    "id": a.id,
                    "name": a.name,
                    "account_type": a.account_type,
                    "account_number": a.account_number,
                    "balance": float(a.balance),
                    "currency": a.currency,
                    "icon": a.icon,
                    "color": a.color,
                    "is_default": a.is_default,
                    "notes": a.notes,
                    "created_at": a.created_at.isoformat()
                }
                for a in accounts
            ],
            "total_balance": total_balance
        }
    }


@router.post("", summary="创建账户")
async def create_account(
    account: AccountCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新账户"""
    # 如果设置为默认账户，先取消其他默认账户
    if account.is_default:
        db.query(Account).filter(
            Account.user_id == current_user["id"],
            Account.is_default == True
        ).update({"is_default": False})

    new_account = Account(
        user_id=current_user["id"],
        name=account.name,
        account_type=account.account_type,
        account_number=account.account_number,
        balance=account.initial_balance,
        currency=account.currency,
        icon=account.icon,
        color=account.color,
        notes=account.notes,
        is_default=account.is_default
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return {
        "success": True,
        "data": {
            "id": new_account.id,
            "name": new_account.name,
            "balance": float(new_account.balance)
        },
        "message": "账户创建成功"
    }


@router.put("/{account_id}", summary="更新账户")
async def update_account(
    account_id: int,
    account: AccountUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新账户信息"""
    db_account = db.query(Account).filter_by(
        id=account_id,
        user_id=current_user["id"]
    ).first()

    if not db_account:
        raise HTTPException(status_code=404, detail="账户不存在")

    # 更新字段
    update_data = account.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_account, field, value)

    # 处理默认账户逻辑
    if account.is_default:
        db.query(Account).filter(
            Account.user_id == current_user["id"],
            Account.id != account_id,
            Account.is_default == True
        ).update({"is_default": False})

    db.commit()

    return {"success": True, "message": "账户更新成功"}


@router.delete("/{account_id}", summary="删除账户")
async def delete_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """软删除账户（设置is_active=False）"""
    db_account = db.query(Account).filter_by(
        id=account_id,
        user_id=current_user["id"]
    ).first()

    if not db_account:
        raise HTTPException(status_code=404, detail="账户不存在")

    db_account.is_active = False
    db.commit()

    return {"success": True, "message": "账户已删除"}
