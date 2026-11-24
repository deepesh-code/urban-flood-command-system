from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import incidents, risk, scenarios, teams, weather, zones
from app.config import settings
from app.db import backend_name

app = FastAPI(
    title="Urban Flood Command System API",
    description="AI flood risk & emergency coordination — Greater Noida pilot. "
                "Explainable weighted risk engine, real Open-Meteo weather, "
                "incident reporting, scenario simulator and response management.",
    version="1.0.0",
)

# CORS: allow the configured frontend origin plus common local dev ports.
_allow = {
    settings.frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
}
_allow.discard("")
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(_allow),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "Urban Flood Command System",
        "version": "1.0.0",
        "backend": backend_name(),
        "pilot": "Greater Noida",
    }


@app.get("/")
def root():
    return {"message": "Urban Flood Command System API", "docs": "/docs"}


app.include_router(weather.router, prefix="/api/v1")
app.include_router(zones.router, prefix="/api/v1")
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(teams.router, prefix="/api/v1")
app.include_router(risk.router, prefix="/api/v1")
app.include_router(scenarios.router, prefix="/api/v1")
