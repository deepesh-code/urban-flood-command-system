"""Open-Meteo weather integration (real data, no API key required).

Honesty rule from the project brief: Open-Meteo is a weather MODEL output,
not a physical rain-gauge reading. Every response is labelled
`data_type: "weather_model_forecast"` and carries a `retrieved_at`
timestamp so the UI never presents it as a sensor observation.
"""
import time
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.config import settings

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

GREATER_NOIDA = {"latitude": 28.4744, "longitude": 77.5040}

_cache: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}


async def get_weather(latitude: float, longitude: float) -> dict[str, Any]:
    """Fetch current + hourly forecast for a point, cached for 5 minutes."""
    key = (round(latitude, 4), round(longitude, 4))
    now = time.time()

    cached = _cache.get(key)
    if cached and now - cached[0] < settings.weather_cache_seconds:
        return {**cached[1], "cached": True}

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,precipitation,rain",
        "hourly": "precipitation,precipitation_probability",
        "forecast_days": 2,
        "timezone": "Asia/Kolkata",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(WEATHER_URL, params=params)
        response.raise_for_status()
        data = response.json()

    result = {
        "source": "Open-Meteo",
        "data_type": "weather_model_forecast",
        "retrieved_at": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime()),
        "coordinates": {"latitude": latitude, "longitude": longitude},
        "current": data.get("current"),
        "hourly": data.get("hourly"),
        "cached": False,
    }

    _cache[key] = (now, result)
    return result


def accumulated_rainfall_next_hours(hourly: dict | None, hours: int = 3) -> float:
    """Sum forecast precipitation from the current local hour onward."""

    if hours < 1:
        raise ValueError("hours must be at least 1")

    if not hourly:
        return 0.0

    times = hourly.get("time") or []
    values = hourly.get("precipitation") or []

    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    current_hour = now.replace(minute=0, second=0, microsecond=0)

    total = 0.0
    count = 0

    for timestamp, value in zip(times, values):
        forecast_time = datetime.fromisoformat(timestamp)

        if forecast_time.tzinfo is None:
            forecast_time = forecast_time.replace(
                tzinfo=ZoneInfo("Asia/Kolkata")
            )

        if forecast_time >= current_hour:
            total += float(value or 0.0)
            count += 1

            if count == hours:
                break

    return round(total, 2)
