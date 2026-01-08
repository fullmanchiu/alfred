from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db import Base


class Category(Base):
    """交易分类模型 - 支持父子分类层级结构"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)  # 分类名称
    type = Column(String(20), nullable=False)  # 分类类型：income, expense
    parent_id = Column(Integer, ForeignKey("categories.id"))  # 父分类ID（支持子分类）
    icon = Column(String(50))  # 图标标识
    color = Column(String(20))  # 颜色代码
    is_system = Column(Boolean, default=False)  # 是否为系统默认分类
    is_active = Column(Boolean, default=True)  # 是否激活
    sort_order = Column(Integer, default=0)  # 排序顺序

    # 自引用关系 - 父子分类
    parent = relationship("Category", remote_side=[id], back_populates="subcategories")
    subcategories = relationship("Category", back_populates="parent", cascade="all, delete-orphan")

    # 关系
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category", cascade="all, delete-orphan")
