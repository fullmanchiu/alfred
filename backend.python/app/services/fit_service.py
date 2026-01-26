from typing import Tuple, Dict, Any, List
from datetime import datetime
try:
    from fitparse import FitFile
except Exception:
    FitFile = None

def parse_fit(file_bytes: bytes) -> Tuple[Dict[str, Any], List[dict], List[dict]]:
    """
    Minimal FIT parser for PoC.
    Returns (metrics, points[], laps[])
    points: time, speed (m/s), hr, power, lat, lon, ele
    laps: start_time, elapsed_s, distance_km, avg_hr, avg_power
    """
    metrics = {"distance_km": 0.0, "avg_hr": None, "avg_power": None, "name": None}
    points: List[dict] = []
    laps: List[dict] = []

    if FitFile is None:
        # Library not available, return stub so PoC UI still works
        metrics["name"] = "Stub Activity"
        return metrics, points, laps

    fit = FitFile(file_bytes)
    # Collect records
    hr_vals, pw_vals, sp_vals = [], [], []
    last_distance_m = 0.0
    for record in fit.get_messages("record"):
        data = {d.name: d.value for d in record}
        ts = data.get("timestamp")
        # normalize to iso string if present
        tsv = None
        if ts:
            if hasattr(ts, "isoformat"):
                tsv = ts.isoformat()
            else:
                tsv = str(ts)
        # Prefer enhanced_* fields when present
        speed = data.get("speed") or data.get("enhanced_speed")
        ele = data.get("enhanced_altitude") or data.get("altitude")

        # Lat/Lon: convert FIT semicircles to degrees if numeric
        def _to_deg(v):
            try:
                if v is None:
                    return None
                # fitparse often returns int semicircles
                if isinstance(v, (int, float)):
                    return float(v) * 180.0 / (2**31)
                # sometimes wrapped object with .value
                if hasattr(v, "value") and isinstance(v.value, (int, float)):
                    return float(v.value) * 180.0 / (2**31)
            except Exception:
                return None
            return None

        p = {
            "time": tsv,
            "speed": speed,      # m/s
            "hr": data.get("heart_rate"),
            "power": data.get("power"),
            "lat": _to_deg(data.get("position_lat")),
            "lon": _to_deg(data.get("position_long")),
            "ele": ele,
        }
        points.append(p)
        if p["hr"] is not None: hr_vals.append(p["hr"])
        if p["power"] is not None: pw_vals.append(p["power"])
        if p["speed"] is not None: sp_vals.append(p["speed"])
        # keep last cumulative distance if present (meters)
        if data.get("distance") is not None:
            try:
                last_distance_m = float(data.get("distance"))
            except Exception:
                pass

    # Sessions for summary metrics if available
    try:
        for msg in fit.get_messages("session"):
            data = {d.name: d.value for d in msg}
            if data.get("total_distance"):
                metrics["distance_km"] = round(float(data["total_distance"]) / 1000.0, 3)
            if data.get("avg_heart_rate"):
                metrics["avg_hr"] = int(data["avg_heart_rate"])
            if data.get("avg_power"):
                metrics["avg_power"] = int(data["avg_power"])
            if data.get("sport"):
                metrics["name"] = str(data["sport"]).capitalize() + " Activity"
            if not metrics.get("name") and data.get("sub_sport"):
                metrics["name"] = str(data["sub_sport"]).capitalize() + " Activity"
    except Exception:
        pass

    # Laps
    try:
        for msg in fit.get_messages("lap"):
            data = {d.name: d.value for d in msg}
            lap = {
                "start_time": data.get("start_time").isoformat() if data.get("start_time") else None,
                "elapsed_s": int(data.get("total_elapsed_time") or 0),
                "distance_km": round(float(data.get("total_distance") or 0.0) / 1000.0, 3),
                "avg_hr": int(data.get("avg_heart_rate") or 0) or None,
                "avg_power": int(data.get("avg_power") or 0) or None,
            }
            laps.append(lap)
    except Exception:
        pass

    # Fallback averages
    if metrics["avg_hr"] is None and hr_vals:
        metrics["avg_hr"] = int(sum(hr_vals) / len(hr_vals))
    if metrics["avg_power"] is None and pw_vals:
        metrics["avg_power"] = int(sum(pw_vals) / len(pw_vals))

    # Use cumulative distance from records if available
    if metrics["distance_km"] == 0.0 and last_distance_m > 0:
        metrics["distance_km"] = round(last_distance_m / 1000.0, 3)
    # Fallback: approximate distance from speed samples
    if metrics["distance_km"] == 0.0 and sp_vals:
        meters = sum([s for s in sp_vals if isinstance(s, (int, float))])
        metrics["distance_km"] = round(meters / 1000.0, 3)

    return metrics, points, laps
