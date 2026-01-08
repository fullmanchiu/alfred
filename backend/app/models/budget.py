from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class Budget(Base):
    """预算模型 - 跟踪分类预算"""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)  # 预算金额
    period = Column(String(20), nullable=False)  # 预算周期：monthly, yearly, weekly, daily
    start_date = Column(DateTime, nullable=False)  # 预算周期开始
    end_date = Column(DateTime)  # 预算结束（可选，用于循环预算）
    alert_threshold = Column(Numeric(5, 2), default=80.0)  # 预警阈值（百分比）
    is_active = Column(Boolean, default=True)  # 是否激活
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    category = relationship("Category", back_populates="budgets")
