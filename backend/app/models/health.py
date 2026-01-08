from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class HealthProfile(Base):
    __tablename__ = "health_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    height = Column(Float, nullable=True)  # 身高(cm)
    weight = Column(Float, nullable=True)  # 体重(kg)
    body_fat = Column(Float, nullable=True)  # 体脂率(%)
    muscle_rate = Column(Float, nullable=True)  # 肌肉率(%)
    water_rate = Column(Float, nullable=True)  # 水分率(%)
    bone_mass = Column(Float, nullable=True)  # 骨量(kg)
    protein_rate = Column(Float, nullable=True)  # 蛋白质率(%)
    bmr = Column(Integer, nullable=True)  # 基础代谢(kcal)
    visceral_fat = Column(Integer, nullable=True)  # 内脏脂肪等级
    bmi = Column(Float, nullable=True)  # 体质指数
    created_at = Column(DateTime, default=datetime.utcnow)  # 填写时间
    
    # 关系
    user = relationship("User", back_populates="health_profiles")
