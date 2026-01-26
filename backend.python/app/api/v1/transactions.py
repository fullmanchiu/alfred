"""交易管理API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.category import Category
from app.models.tag import Tag, TransactionTag
from app.models.transaction_image import TransactionImage
from app.services.transaction_service import TransactionService
from app.schemas.transaction_schemas import TransactionCreateSchema, TransactionUpdateSchema
from app.core.exceptions import (
    AccountNotFoundError,
    InsufficientFundsError,
    InvalidTransactionError
)
from decimal import Decimal

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", summary="创建交易")
async def create_transaction(
    data: TransactionCreateSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新交易记录"""
    try:
        transaction = TransactionService.create_transaction(
            user_id=current_user["id"],
            data=data.dict(),
            db=db
        )
        
        return {
            "success": True,
            "data": {
                "id": transaction.id,
                "type": transaction.type,
                "amount": float(transaction.amount)
            },
            "message": "交易创建成功"
        }
    
    except AccountNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InsufficientFundsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except InvalidTransactionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", summary="获取交易列表")
async def get_transactions(
    type: Optional[str] = Query(None, description="交易类型筛选"),
    category_id: Optional[int] = Query(None, description="分类筛选"),
    account_id: Optional[int] = Query(None, description="账户筛选"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    tag: Optional[str] = Query(None, description="按标签筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取交易列表，支持多维度筛选和分页"""
    query = db.query(Transaction).filter(Transaction.user_id == current_user["id"])

    # 应用筛选
    if type:
        query = query.filter(Transaction.type == type)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if account_id:
        query = query.filter(
            or_(
                Transaction.from_account_id == account_id,
                Transaction.to_account_id == account_id
            )
        )
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    if tag:
        query = query.join(TransactionTag).join(Tag).filter(Tag.name == tag)

    total = query.count()
    transactions = query.order_by(Transaction.transaction_date.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    # 格式化响应
    transactions_data = []
    for t in transactions:
        tags_list = [tt.tag.name for tt in t.tags]
        transactions_data.append({
            "id": t.id,
            "type": t.type,
            "amount": float(t.amount),
            "from_account": {
                "id": t.from_account.id,
                "name": t.from_account.name
            } if t.from_account else None,
            "to_account": {
                "id": t.to_account.id,
                "name": t.to_account.name
            } if t.to_account else None,
            "category": {
                "id": t.category.id,
                "name": t.category.name,
                "icon": t.category.icon
            } if t.category else None,
            "transaction_date": t.transaction_date.isoformat(),
            "notes": t.notes,
            "location": t.location,
            "tags": tags_list,
            "image_count": len(t.images)
        })

    return {
        "success": True,
        "data": {
            "transactions": transactions_data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total
            }
        }
    }


@router.get("/{transaction_id}", summary="获取交易详情")
async def get_transaction_detail(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取交易详情，包括图片和标签"""
    transaction = db.query(Transaction).filter_by(
        id=transaction_id,
        user_id=current_user["id"]
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="交易不存在")

    tags_list = [{
        "id": tt.tag.id,
        "name": tt.tag.name,
        "color": tt.tag.color
    } for tt in transaction.tags]

    images_list = [{
        "id": img.id,
        "file_path": img.file_path,
        "file_name": img.file_name,
        "uploaded_at": img.uploaded_at.isoformat()
    } for img in transaction.images]

    return {
        "success": True,
        "data": {
            "id": transaction.id,
            "type": transaction.type,
            "amount": float(transaction.amount),
            "from_account": {
                "id": transaction.from_account.id,
                "name": transaction.from_account.name
            } if transaction.from_account else None,
            "to_account": {
                "id": transaction.to_account.id,
                "name": transaction.to_account.name
            } if transaction.to_account else None,
            "category": {
                "id": transaction.category.id,
                "name": transaction.category.name
            } if transaction.category else None,
            "transaction_date": transaction.transaction_date.isoformat(),
            "notes": transaction.notes,
            "location": transaction.location,
            "merchant": transaction.merchant,
            "receipt_number": transaction.receipt_number,
            "tags": tags_list,
            "images": images_list,
            "created_at": transaction.created_at.isoformat()
        }
    }


@router.put("/{transaction_id}", summary="更新交易")
async def update_transaction(
    transaction_id: int,
    data: TransactionUpdateSchema,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新交易记录（不修改金额和账户）"""
    try:
        transaction = TransactionService.update_transaction(
            user_id=current_user["id"],
            transaction_id=transaction_id,
            data=data.dict(exclude_unset=True),
            db=db
        )
        
        return {"success": True, "message": "交易更新成功"}
    
    except AccountNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{transaction_id}", summary="删除交易")
async def delete_transaction(
    transaction_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除交易并恢复账户余额"""
    try:
        TransactionService.delete_transaction(
            user_id=current_user["id"],
            transaction_id=transaction_id,
            db=db
        )
        
        return {"success": True, "message": "交易已删除"}
    
    except AccountNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
