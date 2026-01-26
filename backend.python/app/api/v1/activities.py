from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, Dict
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse, Response
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.activity import Activity, ActivityPoint, ActivityLap
from app.core.config import settings
import httpx
import json

router = APIRouter(prefix="/activities", tags=["activities"])

@router.get("", summary="获取运动记录列表")
async def get_activities(
    type: Optional[str] = Query(None, description="运动类型筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取用户的运动记录列表"""
    q = db.query(Activity).filter(Activity.user_id == current_user["id"])
    if type:
        q = q.filter(Activity.type == type)
    
    total = q.count()
    items = (
        q.order_by(Activity.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    
    return {
        "stats": {
            "total_activities": total,
            "total_distance": sum(i.distance or 0 for i in items),
            "total_duration": sum(i.duration or 0 for i in items),
            "total_elevation": sum(i.total_elevation or 0 for i in items),
        },
        "activities": [
            {
                "id": a.id,
                "name": a.name,
                "type": a.type,
                "distance": a.distance,
                "duration": a.duration,
                "avg_speed": a.avg_speed,
                "total_elevation": a.total_elevation,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
        "pagination": {"page": page, "page_size": page_size, "total": total},
    }


@router.get("/{activity_id}", summary="获取运动记录详情")
async def get_activity_detail(
    activity_id: int,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取指定运动记录的详细信息，包括GPS轨迹点和分段数据"""
    a = db.query(Activity).filter_by(id=activity_id, user_id=current_user["id"]).first()
    if not a:
        raise HTTPException(status_code=404, detail="运动记录不存在")

    # 获取GPS轨迹点
    points = (
        db.query(ActivityPoint)
        .filter_by(activity_id=a.id)
        .order_by(ActivityPoint.id)
        .all()
    )
    
    # 获取分段数据
    laps = (
        db.query(ActivityLap)
        .filter_by(activity_id=a.id)
        .order_by(ActivityLap.lap_index)
        .all()
    )

    # 计算基于 points 的汇总数据（如果Activity表中没有这些数据）
    def _safe_mean(values):
        vals = [v for v in values if v is not None]
        return sum(vals) / len(vals) if vals else None

    hr_values = [p.heart_rate for p in points if p.heart_rate is not None]
    power_values = [p.power for p in points if p.power is not None]
    cadence_values = [p.cadence for p in points if p.cadence is not None]

    computed_avg_hr = _safe_mean(hr_values)
    computed_max_hr = max(hr_values) if hr_values else None
    computed_avg_power = _safe_mean(power_values)
    computed_max_power = max(power_values) if power_values else None
    computed_avg_cadence = _safe_mean(cadence_values)

    return {
        "id": a.id,
        "name": a.name,
        "type": a.type,
        "distance": a.distance,
        "duration": a.duration,
        "avg_speed": getattr(a, "avg_speed", None),
        "max_speed": getattr(a, "max_speed", None),
        "total_elevation": getattr(a, "total_elevation", None),
        "avg_heart_rate": getattr(a, "avg_heart_rate", None) or (int(computed_avg_hr) if computed_avg_hr is not None else None),
        "max_heart_rate": getattr(a, "max_heart_rate", None) or computed_max_hr,
        "avg_power": getattr(a, "avg_power", None) or (int(computed_avg_power) if computed_avg_power is not None else None),
        "max_power": getattr(a, "max_power", None) or computed_max_power,
        "avg_cadence": getattr(a, "avg_cadence", None) or (int(computed_avg_cadence) if computed_avg_cadence is not None else None),
        "calories": getattr(a, "calories", None),
        "start_time": getattr(a, "start_time", None).isoformat() if getattr(a, "start_time", None) else None,
        "end_time": getattr(a, "end_time", None).isoformat() if getattr(a, "end_time", None) else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "points": [
            {
                "time": p.time.isoformat() if p.time else None,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "speed": p.speed,
                "heart_rate": p.heart_rate,
                "power": p.power,
                "cadence": p.cadence,
                "elevation": p.elevation,
            }
            for p in points
        ],
        "laps": [
            {
                "lap_index": l.lap_index,
                "start_time": l.start_time.isoformat() if l.start_time else None,
                "elapsed_time": l.elapsed_time,
                "distance": l.distance,
                "avg_heart_rate": l.avg_heart_rate,
                "avg_power": l.avg_power,
                "avg_speed": l.avg_speed,
            }
            for l in laps
        ],
    }




