"""初始化记账数据API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import logging

from app.deps import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User as UserModel
from app.models.account import Account
from app.models.category import Category
from app.services import category_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/init", tags=["initialization"])


@router.post("/accounting", summary="初始化记账数据")
async def init_accounting_data(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    为现有用户初始化记账数据（默认分类和默认账户）

    适用场景：
    - 老用户在记账功能上线前注册，没有默认分类和账户
    - 用户删除了所有分类和账户，需要重新初始化

    注意：
    - 如果已有分类或账户，不会重复创建
    - 默认账户仅在没有账户时创建
    """
    user_id = current_user["id"]

    # 检查是否已有分类
    existing_categories = db.query(Category).filter(
        Category.user_id == user_id,
        Category.is_active == True
    ).count()

    # 检查是否已有账户
    existing_accounts = db.query(Account).filter(
        Account.user_id == user_id,
        Account.is_active == True
    ).count()

    results = {
        "categories_created": 0,
        "account_created": False,
        "skipped": False,
        "message": ""
    }

    # 初始化默认分类
    if existing_categories == 0:
        try:
            category_service.init_default_categories(user_id, db)
            new_categories = db.query(Category).filter(
                Category.user_id == user_id,
                Category.is_active == True
            ).count()
            results["categories_created"] = new_categories
            logger.info(f"初始化成功: 为用户 {user_id} 创建了 {new_categories} 个默认分类")
        except Exception as e:
            logger.error(f"初始化失败: 用户 {user_id} 分类创建错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"分类创建失败: {str(e)}")
    else:
        logger.info(f"跳过: 用户 {user_id} 已有 {existing_categories} 个分类")
        results["categories_created"] = 0
        results["skipped"] = True

    # 创建默认账户
    if existing_accounts == 0:
        try:
            default_account = Account(
                user_id=user_id,
                name="现金",
                account_type="cash",
                balance=0.00,
                currency="CNY",
                is_default=True,
                icon="account_balance_wallet",
                color="#4CAF50"
            )
            db.add(default_account)
            db.commit()
            db.refresh(default_account)
            results["account_created"] = True
            logger.info(f"初始化成功: 为用户 {user_id} 创建了默认账户 {default_account.id}")
        except Exception as e:
            logger.error(f"初始化失败: 用户 {user_id} 账户创建错误: {str(e)}")
            raise HTTPException(status_code=500, detail=f"账户创建失败: {str(e)}")
    else:
        logger.info(f"跳过: 用户 {user_id} 已有 {existing_accounts} 个账户")
        results["account_created"] = False
        results["skipped"] = True

    # 生成返回消息
    if results["skipped"]:
        if results["categories_created"] > 0 or results["account_created"]:
            results["message"] = "部分数据已初始化（跳过已存在的部分）"
        else:
            results["message"] = "数据已存在，无需初始化"
    else:
        if results["categories_created"] > 0 and results["account_created"]:
            results["message"] = "初始化成功：已创建默认分类和默认账户"
        elif results["categories_created"] > 0:
            results["message"] = "初始化成功：已创建默认分类"
        elif results["account_created"]:
            results["message"] = "初始化成功：已创建默认账户"

    return {
        "success": True,
        "data": results
    }


@router.get("/status", summary="检查初始化状态")
async def check_init_status(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """检查当前用户的记账数据初始化状态"""
    user_id = current_user["id"]

    categories_count = db.query(Category).filter(
        Category.user_id == user_id,
        Category.is_active == True
    ).count()

    accounts_count = db.query(Account).filter(
        Account.user_id == user_id,
        Account.is_active == True
    ).count()

    has_default_account = db.query(Account).filter(
        Account.user_id == user_id,
        Account.is_default == True,
        Account.is_active == True
    ).first() is not None

    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "categories_count": categories_count,
            "accounts_count": accounts_count,
            "has_default_account": has_default_account,
            "needs_initialization": categories_count == 0 or accounts_count == 0
        }
    }
