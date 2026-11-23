"""Application settings.

The backend runs in two modes:
  1. SUPABASE mode  – when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
                      all data lives in Supabase PostgreSQL (with PostGIS).
  2. LOCAL mode     – falls back to an embedded SQLite database so the demo
                      always works, even with zero configuration.

The service-role key is only ever read here, on the backend. It must never
appear in any NEXT_PUBLIC_* variable or in the browser.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    frontend_url: str = "http://localhost:3000"
    database_path: str = "flood.db"
    weather_cache_seconds: int = 300  # 5-minute cache for Open-Meteo

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
