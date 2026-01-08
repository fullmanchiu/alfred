from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Index, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class TransactionType:
    """交易类型常量"""
    INCOME = "income"  # 收入
    EXPENSE = "expense"  # 支出
    TRANSFER = "transfer"  # 转账
    LOAN_IN = "loan_in"  # 借入
    LOAN_OUT = "loan_out"  # 借出
    REPAYMENT = "repayment"  # 还款


class Transaction(Base):
    """交易记录模型 - 核心交易数据"""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 交易类型和金额
    type = Column(String(20), nullable=False)  # 交易类型
    amount = Column(Numeric(15, 2), nullable=False)  # 交易金额

    # 账户关系
    # 对于收入/支出：from_account是使用的账户
    # 对于转账：from_account -> to_account
    # 对于借贷：borrower's account <-> lender's account
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)

    # 分类和标签
    category_id = Column(Integer, ForeignKey("categories.id"))

    # 交易元数据
    transaction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text)  # 备注
    location = Column(String(200))  # 交易地点
    merchant = Column(String(200))  # 商户名称
    receipt_number = Column(String(100))  # 收据/发票号

    # 借贷相关字段
    related_transaction_id = Column(Integer, ForeignKey("transactions.id"))  # 关联交易（用于还款）
    loan_status = Column(String(20))  # 借贷状态：pending, partial, completed

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关系
    from_account = relationship("Account", foreign_keys=[from_account_id], back_populates="transactions_as_source")
    to_account = relationship("Account", foreign_keys=[to_account_id], back_populates="transactions_as_destination")
    category = relationship("Category", back_populates="transactions")
    tags = relationship("TransactionTag", back_populates="transaction", cascade="all, delete-orphan")
    images = relationship("TransactionImage", back_populates="transaction", cascade="all, delete-orphan")
    related_transaction = relationship("Transaction", remote_side=[id], foreign_keys=[related_transaction_id])

    # 索引
    __table_args__ = (
        Index('idx_transaction_user', 'user_id'),
        Index('idx_transaction_date', 'transaction_date'),
        Index('idx_transaction_type', 'type'),
        Index('idx_transaction_category', 'category_id'),
    )
