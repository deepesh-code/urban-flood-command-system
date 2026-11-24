import asyncio
import httpx

from app.services import weather_service


def test_weather_falls_back_when_provider_fails(monkeypatch):
    weather_service._cache.clear()
    calls = {"count": 0}

    class FailedWeatherClient:
        def __init__(self, timeout=None):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *args, **kwargs):
            calls["count"] += 1
            request = httpx.Request("GET", weather_service.WEATHER_URL)
            raise httpx.ConnectError("Simulated provider outage", request=request)

    monkeypatch.setattr(
        weather_service.httpx,
        "AsyncClient",
        FailedWeatherClient,
    )

    async def run_test():
        first = await weather_service.get_weather(28.4744, 77.5040)
        second = await weather_service.get_weather(28.4744, 77.5040)
        return first, second

    try:
        first, second = asyncio.run(run_test())

        assert first["data_type"] == "simulated_fallback"
        assert first["is_simulated"] is True
        assert first["source"] == "Built-in synthetic demonstration data"
        assert first["current"] is not None
        assert len(first["hourly"]["time"]) == 24
        assert second["is_simulated"] is True
        assert second["cached"] is True
        assert calls["count"] == 1

    finally:
        weather_service._cache.clear()
