
from fastapi import APIRouter, HTTPException, Query

from app.db import backend_name, list_zones
from app.services.weather_service import GREATER_NOIDA, get_weather

router = APIRouter(tags=["weather"])


@router.get("/weather")
async def weather(
    zone_id: str | None = Query(default=None),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
):
    """Return live weather or clearly labelled synthetic fallback."""

    lat, lng = latitude, longitude
    zone_name = None

    if zone_id:
        zones = {z["id"]: z for z in list_zones()}
        zone = zones.get(zone_id)

        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")

        lat, lng = zone["center_lat"], zone["center_lng"]
        zone_name = zone["name"]

    if lat is None or lng is None:
        lat = GREATER_NOIDA["latitude"]
        lng = GREATER_NOIDA["longitude"]

    data = await get_weather(lat, lng)

    return {
        "zone_id": zone_id,
        "zone_name": zone_name,
        "backend": backend_name(),
        **data,
    }
