from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50))
    phone = Column(String(20))
    email = Column(String(100))
    location = Column(String(100))
    gender = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系 - 一对多，一个用户可以有多条健康数据记录
    health_profiles = relationship("HealthProfile", back_populates="user", order_by="desc(HealthProfile.created_at)")
