from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db import Base

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(200), nullable=False)
    type = Column(String(50))
    distance = Column(Integer, default=0)
    duration = Column(Integer, default=0)
    avg_speed = Column(Float)
    max_speed = Column(Float)
    total_elevation = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    points = relationship("ActivityPoint", cascade="all, delete-orphan", backref="activity")
    laps = relationship("ActivityLap", cascade="all, delete-orphan", backref="activity")

class ActivityPoint(Base):
    __tablename__ = "activity_points"
    id = Column(Integer, primary_key=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    time = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    speed = Column(Float)
    heart_rate = Column(Integer)
    power = Column(Integer)
    cadence = Column(Integer)
    elevation = Column(Float)

class ActivityLap(Base):
    __tablename__ = "activity_laps"
    id = Column(Integer, primary_key=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"))
    lap_index = Column(Integer)
    start_time = Column(DateTime)
    elapsed_time = Column(Integer)
    distance = Column(Integer)
    avg_heart_rate = Column(Integer)
    avg_power = Column(Integer)
    avg_speed = Column(Float)
