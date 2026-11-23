
from fastapi import APIRouter, Header, HTTPException

from app.db import (
    backend_name,
    list_assignments,
    list_teams,
    create_assignment,
    set_team_availability,
    get_incident,
)
from app.schemas.incident import AssignmentCreate, TeamAvailabilityUpdate

router = APIRouter(tags=["teams"])

OPERATOR_ROLES = {"operator", "admin"}


def _require_operator(role: str | None) -> None:
    if role not in OPERATOR_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Operator role required for this action.",
        )


@router.get("/teams")
def teams():
    return {"backend": backend_name(), "teams": list_teams()}


@router.patch("/teams/{team_id}")
def update_team(
    team_id: str,
    payload: TeamAvailabilityUpdate,
    x_role: str | None = Header(default=None),
):
    _require_operator(x_role)
    updated = set_team_availability(team_id, payload.availability)
    if not updated:
        raise HTTPException(status_code=404, detail="Team not found")
    return updated


@router.get("/assignments")
def assignments():
    return {"backend": backend_name(), "assignments": list_assignments()}


@router.post("/assignments", status_code=201)
def create_assignment_endpoint(
    payload: AssignmentCreate,
    x_role: str | None = Header(default=None),
):
    _require_operator(x_role)

    incident = get_incident(payload.incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    existing_assignments = list_assignments()
    already_assigned = any(
        item["incident_id"] == payload.incident_id
        for item in existing_assignments
    )

    if already_assigned or incident["status"] != "new":
        raise HTTPException(
            status_code=409,
            detail="This incident already has an assignment or is not available for assignment.",
        )

    return create_assignment(payload.model_dump())
