from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class Account(Base):
    """账户模型 - 支持银行卡、现金、支付宝等多种账户类型"""
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)  # 账户名称，如"招商银行"、"现金"、"支付宝"
    account_type = Column(String(50), nullable=False)  # 账户类型：bank_card, cash, alipay, wechat, credit_card
    account_number = Column(String(100))  # 账号（可选，如卡号后4位）
    balance = Column(Numeric(15, 2), default=0)  # 当前余额
    currency = Column(String(10), default="CNY")  # 货币类型
    is_active = Column(Boolean, default=True)  # 是否激活
    is_default = Column(Boolean, default=False)  # 是否为默认账户
    icon = Column(String(50))  # 图标标识
    color = Column(String(20))  # 颜色代码
    notes = Column(String(500))  # 备注
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    transactions_as_source = relationship(
        "Transaction",
        foreign_keys="Transaction.from_account_id",
        back_populates="from_account"
    )
    transactions_as_destination = relationship(
        "Transaction",
        foreign_keys="Transaction.to_account_id",
        back_populates="to_account"
    )

    # 索引
    __table_args__ = (
        Index('idx_account_user', 'user_id'),
        Index('idx_account_type', 'account_type'),
    )
