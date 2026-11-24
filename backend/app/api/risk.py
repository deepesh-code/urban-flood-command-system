from fastapi import APIRouter, HTTPException

from app.db import latest_risk_per_zone, list_incidents, list_zones, save_risk_assessment
from app.schemas.risk import RiskRequest
from app.services.risk_engine import (
    calculate_risk,
    incident_score_from_reports,
    rainfall_mm_to_score,
)
from app.services.weather_service import accumulated_rainfall_next_hours, get_weather

router = APIRouter(tags=["risk"])


@router.post("/risk/calculate")
def calculate(payload: RiskRequest):
    """Explainable weighted risk score from four normalized inputs."""
    result = calculate_risk(
        payload.rainfall_score,
        payload.terrain_score,
        payload.drainage_score,
        payload.incident_score,
        is_simulated=payload.is_simulated,
    )
    if payload.zone_id:
        save_risk_assessment(payload.zone_id, result)
    return result


@router.post("/risk/refresh")
async def refresh():
    """Recompute and persist risk assessments using available weather data."""

    zones = list_zones()
    incidents = list_incidents()
    results = []

    for z in zones:
        try:
            weather = await get_weather(
                z["center_lat"],
                z["center_lng"],
            )

            rain_mm = accumulated_rainfall_next_hours(
                weather.get("hourly"),
                hours=3,
            )

            weather_is_simulated = weather.get(
                "is_simulated",
                weather.get("data_type") != "weather_model_forecast",
            )

        except Exception:
            rain_mm = 0.0
            weather_is_simulated = True

        open_incidents = [
            i for i in incidents
            if i.get("zone_id") == z["id"]
            and i["status"] != "resolved"
        ]

        result = calculate_risk(
            rainfall_score=rainfall_mm_to_score(rain_mm),
            terrain_score=z["terrain_score"],
            drainage_score=z["drainage_score"],
            incident_score=incident_score_from_reports(open_incidents),
            is_simulated=weather_is_simulated,
        )

        saved = save_risk_assessment(z["id"], result)

        results.append({
            "zone": z["name"],
            "zone_id": z["id"],
            **result,
            "assessment_id": saved["id"],
        })

    results.sort(
        key=lambda r: r["risk_score"],
        reverse=True,
    )

    return {
        "refreshed": len(results),
        "ranking": results,
    }



@router.get("/risk")
def risk_all():
    """Latest stored risk assessment for every zone."""
    zones = {z["id"]: z for z in list_zones()}
    latest = latest_risk_per_zone()
    out = []
    for zid, assessment in latest.items():
        if zid in zones:
            out.append({"zone": zones[zid]["name"], **assessment})
    out.sort(key=lambda r: r["risk_score"], reverse=True)
    return {"assessments": out}


@router.get("/risk/{zone_id}")
def risk_for_zone(zone_id: str):
    zones = {z["id"]: z for z in list_zones()}
    if zone_id not in zones:
        raise HTTPException(status_code=404, detail="Zone not found")
    latest = latest_risk_per_zone().get(zone_id)
    if not latest:
        raise HTTPException(status_code=404, detail="No assessment yet — POST /risk/refresh first")
    return {"zone": zones[zone_id]["name"], **latest}
