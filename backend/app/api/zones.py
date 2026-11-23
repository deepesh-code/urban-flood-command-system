from fastapi import APIRouter

from app.db import backend_name, latest_risk_per_zone, list_incidents, list_zones
from app.services.risk_engine import incident_score_from_reports

router = APIRouter(tags=["zones"])


@router.get("/zones")
def zones():
    """All monitoring zones with their latest risk score and open-incident count."""
    zone_list = list_zones()
    incidents = list_incidents()
    latest_risk = latest_risk_per_zone()

    result = []
    for z in zone_list:
        open_incidents = [
            i for i in incidents
            if i.get("zone_id") == z["id"] and i["status"] != "resolved"
        ]
        risk = latest_risk.get(z["id"])
        result.append({
            **z,
            "open_incidents": len(open_incidents),
            "incident_score": incident_score_from_reports(open_incidents),
            "latest_risk": risk,
        })

    return {"backend": backend_name(), "zones": result}
