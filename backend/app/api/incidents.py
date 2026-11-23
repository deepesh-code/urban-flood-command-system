from fastapi import APIRouter, Header, HTTPException, Query

from app.db import (
    audit,
    backend_name,
    create_incident,
    get_incident,
    list_incidents,
    update_incident_status,
)
from app.schemas.incident import IncidentCreate, IncidentStatusUpdate

router = APIRouter(tags=["incidents"])

# Status changes are operator actions. The demo uses an X-Role header set by
# the UI role switcher; a production deployment would verify a real session.
OPERATOR_ROLES = {"operator", "admin"}


def _require_operator(role: str | None) -> None:
    if role not in OPERATOR_ROLES:
        audit("permission_denied", role or "viewer", "Operator action attempted")
        raise HTTPException(
            status_code=403,
            detail="Operator role required for this action (viewer is read-only).",
        )


@router.get("/incidents")
def incidents(status: str | None = Query(default=None)):
    if status and status not in {"new", "assigned", "on_site", "resolved"}:
        raise HTTPException(status_code=400, detail="Invalid status filter")
    return {"backend": backend_name(), "incidents": list_incidents(status=status)}


@router.post("/incidents", status_code=201)
def create_incident_endpoint(payload: IncidentCreate):
    return create_incident(payload.model_dump())


@router.patch("/incidents/{incident_id}")
def update_incident_endpoint(
    incident_id: str,
    payload: IncidentStatusUpdate,
    x_role: str | None = Header(default=None),
):
    _require_operator(x_role)
    if not get_incident(incident_id):
        raise HTTPException(status_code=404, detail="Incident not found")
    return update_incident_status(incident_id, payload.status, x_role)
