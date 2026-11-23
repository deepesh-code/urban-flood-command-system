from pydantic import BaseModel, Field


class RiskRequest(BaseModel):
    rainfall_score: float = Field(ge=0, le=100)
    terrain_score: float = Field(ge=0, le=100)
    drainage_score: float = Field(ge=0, le=100)
    incident_score: float = Field(ge=0, le=100)
    is_simulated: bool = False
    zone_id: str | None = None


class ScenarioRequest(BaseModel):
    rainfall_mm: float = Field(ge=0, le=500, description="Simulated accumulated rainfall in mm")
    hours: int = Field(default=3, ge=1, le=24)
    include_current_incidents: bool = True
