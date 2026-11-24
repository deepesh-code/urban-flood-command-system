
"""Weather integration: Open-Meteo with an explicitly labelled demo fallback.

Open-Meteo provides weather model output, not physical rain-gauge readings.
When the provider is unavailable, synthetic demonstration data is returned.
Synthetic data must never be represented as a real observation or forecast.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
GREATER_NOIDA = {"latitude": 28.4744, "longitude": 77.5040}
INDIA_TZ = ZoneInfo("Asia/Kolkata")

_cache: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}
_weather_lock = asyncio.Lock()


def _simulated_weather(
    latitude: float,
    longitude: float,
    reason: str,
) -> dict[str, Any]:
    """Create clearly labelled synthetic weather for demonstration."""

    now = datetime.now(INDIA_TZ)
    current_hour = now.replace(minute=0, second=0, microsecond=0)

    rainfall_pattern = [
        0.0, 0.4, 0.8, 1.2, 0.6, 0.2,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    ]

    probability_pattern = [
        10, 25, 45, 65, 40, 20,
        10, 5, 5, 5, 5, 5,
        5, 5, 5, 5, 5, 5,
        5, 5, 5, 5, 5, 5,
    ]

    forecast_times = [
        (current_hour + timedelta(hours=i)).isoformat()
        for i in range(24)
    ]

    return {
        "source": "Built-in synthetic demonstration data",
        "data_type": "simulated_fallback",
        "is_simulated": True,
        "fallback_reason": reason,
        "retrieved_at": now.isoformat(),
        "coordinates": {
            "latitude": latitude,
            "longitude": longitude,
        },
        "current": {
            "time": now.isoformat(),
            "temperature_2m": 28.0,
            "precipitation": 0.0,
            "rain": 0.0,
        },
        "hourly": {
            "time": forecast_times,
            "precipitation": rainfall_pattern,
            "precipitation_probability": probability_pattern,
        },
        "cached": False,
    }


async def get_weather(latitude: float, longitude: float) -> dict[str, Any]:
    """Fetch live weather, falling back to cached synthetic demo data."""

    key = (round(latitude, 4), round(longitude, 4))

    cached = _cache.get(key)
    now = time.time()

    if cached and now - cached[0] < settings.weather_cache_seconds:
        return {**cached[1], "cached": True}

    async with _weather_lock:
        # Recheck after acquiring the lock.
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

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(WEATHER_URL, params=params)
                response.raise_for_status()
                data = response.json()

            result = {
                "source": "Open-Meteo",
                "data_type": "weather_model_forecast",
                "is_simulated": False,
                "retrieved_at": datetime.now(INDIA_TZ).isoformat(),
                "coordinates": {
                    "latitude": latitude,
                    "longitude": longitude,
                },
                "current": data.get("current"),
                "hourly": data.get("hourly"),
                "cached": False,
            }

        except (httpx.HTTPError, ValueError) as exc:
            logger.exception(
                "Live weather provider failed; using synthetic fallback"
            )

            result = _simulated_weather(
                latitude,
                longitude,
                reason=f"{type(exc).__name__}: live provider unavailable",
            )

        # Cache both live responses and fallback responses.
        # This prevents repeatedly hitting a rate-limited provider.
        _cache[key] = (time.time(), result)

        return result


def accumulated_rainfall_next_hours(
    hourly: dict | None,
    hours: int = 3,
) -> float:
    """Sum forecast precipitation from the current local hour onward."""

    if hours < 1:
        raise ValueError("hours must be at least 1")

    if not hourly:
        return 0.0

    times = hourly.get("time") or []
    values = hourly.get("precipitation") or []

    now = datetime.now(INDIA_TZ)
    current_hour = now.replace(
        minute=0,
        second=0,
        microsecond=0,
    )

    total = 0.0
    count = 0

    for timestamp, value in zip(times, values):
        forecast_time = datetime.fromisoformat(timestamp)

        if forecast_time.tzinfo is None:
            forecast_time = forecast_time.replace(tzinfo=INDIA_TZ)

        if forecast_time >= current_hour:
            total += float(value or 0.0)
            count += 1

            if count == hours:
                break

    return round(total, 2)
