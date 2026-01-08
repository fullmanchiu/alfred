from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base


class TransactionImage(Base):
    """交易图片模型 - 存储交易凭证图片"""
    __tablename__ = "transaction_images"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)  # 文件路径（相对于data目录）
    file_name = Column(String(255), nullable=False)  # 原始文件名
    file_size = Column(Integer)  # 文件大小（字节）
    mime_type = Column(String(100))  # MIME类型：image/jpeg, image/png
    width = Column(Integer)  # 图片宽度
    height = Column(Integer)  # 图片高度
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    transaction = relationship("Transaction", back_populates="images")
