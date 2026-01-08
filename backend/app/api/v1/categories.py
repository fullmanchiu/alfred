"""分类管理API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.category import Category

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="分类名称")
    type: str = Field(..., description="分类类型：income or expense")
    parent_id: Optional[int] = Field(None, description="父分类ID")
    icon: Optional[str] = Field(None, description="图标标识")
    color: Optional[str] = Field(None, description="颜色代码")


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("", summary="获取分类列表")
async def get_categories(
    type: Optional[str] = Query(None, description="分类类型筛选"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的分类列表，支持按类型筛选"""
    query = db.query(Category).filter(Category.user_id == current_user["id"])

    if type:
        query = query.filter(Category.type == type)

    categories = query.filter(Category.is_active == True) \
        .order_by(Category.sort_order, Category.name) \
        .all()

    # 构建层级结构
    def build_category(cat):
        return {
            "id": cat.id,
            "name": cat.name,
            "type": cat.type,
            "icon": cat.icon,
            "color": cat.color,
            "is_system": cat.is_system,
            "parent_id": cat.parent_id,
            "sort_order": cat.sort_order,
            "subcategories": [
                build_category(sub) for sub in cat.subcategories if sub.is_active
            ]
        }

    categories_data = [build_category(c) for c in categories if c.parent_id is None]

    return {"success": True, "data": categories_data}


@router.post("", summary="创建分类")
async def create_category(
    category: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新分类"""
    new_category = Category(
        user_id=current_user["id"],
        name=category.name,
        type=category.type,
        parent_id=category.parent_id,
        icon=category.icon,
        color=category.color
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return {
        "success": True,
        "data": {"id": new_category.id, "name": new_category.name},
        "message": "分类创建成功"
    }


@router.put("/{category_id}", summary="更新分类")
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新分类信息"""
    db_category = db.query(Category).filter_by(
        id=category_id,
        user_id=current_user["id"]
    ).first()

    if not db_category:
        raise HTTPException(status_code=404, detail="分类不存在")

    update_data = category.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_category, field, value)

    db.commit()

    return {"success": True, "message": "分类更新成功"}


@router.delete("/{category_id}", summary="删除分类")
async def delete_category(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """软删除分类"""
    db_category = db.query(Category).filter_by(
        id=category_id,
        user_id=current_user["id"]
    ).first()

    if not db_category:
        raise HTTPException(status_code=404, detail="分类不存在")

    if db_category.is_system:
        raise HTTPException(status_code=400, detail="系统默认分类不能删除")

    db_category.is_active = False
    db.commit()

    return {"success": True, "message": "分类已删除"}
