from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Dict
from pathlib import Path
from uuid import uuid4
from datetime import date
import os
from sqlalchemy.orm import Session
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.activity import Activity
from app.models.activity import ActivityPoint, ActivityLap
from fitparse import FitFile

router = APIRouter(prefix="/upload", tags=["upload"])

DATA_DIR = Path(__file__).resolve().parents[3] / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

@router.post("", summary="上传FIT文件")
async def upload_fit_files(
    files: List[UploadFile] = File(..., description="FIT文件（支持多文件）"),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="未选择文件")

    created = []
    for f in files:
        # 防止路径穿越，取安全文件名
        safe_name = Path(f.filename).name
        if not safe_name.lower().endswith(".fit"):
            raise HTTPException(status_code=400, detail=f"{safe_name} 不是 FIT 文件")

        # 为当前用户创建目录： data/update/fit/<username>/<YYYY_MM_DD>/
        username_safe = Path(str(current_user.get("username", "user"))).name
        date_str = date.today().strftime("%Y_%m_%d")
        user_dir = DATA_DIR / "update" / "fit" / username_safe / date_str
        user_dir.mkdir(parents=True, exist_ok=True)

        # 如果文件名冲突，添加 uuid 后缀避免覆盖
        target = user_dir / safe_name
        if target.exists():
            target = user_dir / f"{target.stem}_{uuid4().hex}{target.suffix}"

        content = await f.read()
        target.write_bytes(content)

        # 先创建占位 Activity（后续可在解析后补充指标/点/圈）
        # 在 Activity 中记录相对路径，便于后续解析或下载
        rel_path = target.relative_to(DATA_DIR).as_posix()
        a = Activity(user_id=current_user["id"], name=rel_path, type="cycling")
        db.add(a)
        db.commit()
        db.refresh(a)

        # 解析 FIT 并写入 points / laps，同时更新 Activity 的统计字段
        try:
            fit = FitFile(str(target))

            points_added = []
            max_speed = None
            elevations = []
            first_ts = None
            last_ts = None

            # 记录点
            for record in fit.get_messages("record"):
                ts = record.get_value("timestamp")
                if ts and first_ts is None:
                    first_ts = ts
                if ts:
                    last_ts = ts

                lat = record.get_value("position_lat")
                lon = record.get_value("position_long")
                speed = record.get_value("speed")
                heart_rate = record.get_value("heart_rate")
                power = record.get_value("power")
                cadence = record.get_value("cadence")
                elevation = record.get_value("altitude")

                p = ActivityPoint(
                    activity_id=a.id,
                    time=ts,
                    latitude=lat,
                    longitude=lon,
                    speed=speed,
                    heart_rate=heart_rate,
                    power=power,
                    cadence=cadence,
                    elevation=elevation,
                )
                db.add(p)
                points_added.append(p)
                if speed is not None:
                    if max_speed is None or speed > max_speed:
                        max_speed = speed
                if elevation is not None:
                    elevations.append(elevation)

            # 记录圈（lap）
            lap_index = 0
            for lap in fit.get_messages("lap"):
                lap_index += 1
                start_time = lap.get_value("start_time")
                elapsed = lap.get_value("total_elapsed_time") or lap.get_value("elapsed_time")
                distance_l = lap.get_value("total_distance") or lap.get_value("distance")
                avg_hr = lap.get_value("avg_heart_rate")
                avg_power = lap.get_value("avg_power")
                avg_speed_l = lap.get_value("avg_speed")

                l = ActivityLap(
                    activity_id=a.id,
                    lap_index=lap_index,
                    start_time=start_time,
                    elapsed_time=int(elapsed) if elapsed is not None else None,
                    distance=int(distance_l) if distance_l is not None else None,
                    avg_heart_rate=avg_hr,
                    avg_power=avg_power,
                    avg_speed=avg_speed_l,
                )
                db.add(l)

            db.commit()

            # 更新 Activity 的汇总字段
            total_distance = None
            # 尝试读取最后一条 record 的 distance 字段（若存在）
            try:
                last_distance = None
                for rec in fit.get_messages("record"):
                    d = rec.get_value("distance")
                    if d is not None:
                        last_distance = d
                if last_distance is not None:
                    total_distance = int(last_distance)
            except Exception:
                total_distance = None

            duration = None
            if first_ts and last_ts:
                duration = int((last_ts - first_ts).total_seconds())

            a.distance = total_distance or 0
            a.duration = duration or 0
            # Convert to km/h: total_distance (meters) / duration (seconds) -> m/s, *3.6 -> km/h
            a.avg_speed = float(total_distance * 3.6 / duration) if (total_distance and duration and duration > 0) else None
            a.max_speed = max_speed
            if elevations:
                a.total_elevation = int(max(elevations) - min(elevations))

            db.add(a)
            db.commit()
        except Exception:
            # 解析失败不影响上传成功，但留空统计，避免抛出
            db.rollback()

        created.append({"id": a.id, "name": a.name})

    return {"success": True, "uploaded_count": len(created), "activities": created}

@router.post("batch", summary="批量上传并合并运动记录")
async def batch_upload_fit_files(
    files: List[UploadFile] = File(..., description="FIT文件列表"),
    merge: bool = False,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 先复用单上传逻辑；后续若 merge=True 需要“合并生成一条 Activity”，可在这里实现
    return await upload_fit_files(files=files, current_user=current_user, db=db)
