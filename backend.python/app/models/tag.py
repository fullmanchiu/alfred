from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class Tag(Base):
    """标签模型 - 用于交易标签"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)  # 标签名称
    color = Column(String(20))  # 颜色代码
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    transaction_usage = relationship("TransactionTag", back_populates="tag")


class TransactionTag(Base):
    """交易标签关联模型 - 多对多关系"""
    __tablename__ = "transaction_tags"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"))
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    transaction = relationship("Transaction", back_populates="tags")
    tag = relationship("Tag", back_populates="transaction_usage")
