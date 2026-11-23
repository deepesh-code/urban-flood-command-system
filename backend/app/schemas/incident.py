from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    zone_id: str | None = None
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    is_simulated: bool = False
    source: str = "user_report"
    reported_by: str | None = None


class IncidentStatusUpdate(BaseModel):
    status: str = Field(pattern="^(new|assigned|on_site|resolved)$")


class AssignmentCreate(BaseModel):
    incident_id: str
    team_id: str
    assigned_by: str | None = None
    notes: str | None = None


class TeamAvailabilityUpdate(BaseModel):
    availability: str = Field(pattern="^(available|busy|offline)$")
