"""Scenario simulator: 'what if it rains X mm over the next Y hours?'

All scenario results are permanently labelled is_simulated=true so the UI
can visually distinguish them from real data. Scores use the SAME risk
engine and weights as real assessments — only the rainfall input changes.
"""

import uuid

from fastapi import APIRouter

from app.db import list_incidents, list_zones
from app.schemas.risk import ScenarioRequest
from app.services.risk_engine import (
    calculate_risk,
    incident_score_from_reports,
    rainfall_mm_to_score,
)

router = APIRouter(tags=["scenarios"])

_scenario_store: dict[str, dict] = {}


@router.post("/scenarios/run")
def run_scenario(payload: ScenarioRequest):
    zones = list_zones()
    incidents = list_incidents() if payload.include_current_incidents else []

    rainfall_score = rainfall_mm_to_score(payload.rainfall_mm)
    results = []

    for z in zones:
        open_incidents = [
            i for i in incidents
            if i.get("zone_id") == z["id"] and i["status"] != "resolved"
        ]
        result = calculate_risk(
            rainfall_score=rainfall_score,
            terrain_score=z["terrain_score"],
            drainage_score=z["drainage_score"],
            incident_score=incident_score_from_reports(open_incidents),
            is_simulated=True,
        )
        results.append({"zone": z["name"], "zone_id": z["id"], **result})

    results.sort(key=lambda r: r["risk_score"], reverse=True)

    scenario_id = str(uuid.uuid4())
    scenario = {
        "id": scenario_id,
        "inputs": {
            "rainfall_mm": payload.rainfall_mm,
            "hours": payload.hours,
            "include_current_incidents": payload.include_current_incidents,
        },
        "is_simulated": True,
        "ranking": results,
    }
    _scenario_store[scenario_id] = scenario
    return scenario


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    if scenario_id not in _scenario_store:
        return {"id": scenario_id, "expired": True,
                "detail": "Scenario results are kept in memory on the backend for the session."}
    return _scenario_store[scenario_id]
