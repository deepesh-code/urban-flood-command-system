"""End-to-end API tests using FastAPI's TestClient (SQLite fallback mode)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "healthy"
    assert body["pilot"] == "Greater Noida"


def test_risk_calculate():
    res = client.post("/api/v1/risk/calculate", json={
        "rainfall_score": 85, "terrain_score": 70,
        "drainage_score": 65, "incident_score": 80,
        "is_simulated": True,
    })
    assert res.status_code == 200
    body = res.json()
    assert body["risk_score"] == 76.25
    assert body["risk_level"] == "High"
    assert body["is_simulated"] is True


def test_risk_validation_rejects_bad_input():
    res = client.post("/api/v1/risk/calculate", json={
        "rainfall_score": 150, "terrain_score": 70,
        "drainage_score": 65, "incident_score": 80,
    })
    assert res.status_code == 422


def test_zones_seeded():
    res = client.get("/api/v1/zones")
    assert res.status_code == 200
    zones = res.json()["zones"]
    names = {z["name"] for z in zones}
    assert "Pari Chowk" in names
    assert "Knowledge Park" in names
    assert len(zones) >= 5


def test_incident_lifecycle_and_permissions():
    # Create an incident (any role may report)
    res = client.post("/api/v1/incidents", json={
        "title": "Waterlogging near Pari Chowk underpass",
        "description": "Road submerged, traffic diverted.",
        "latitude": 28.4657, "longitude": 77.5025,
        "severity": "high",
        "reported_by": "demo-viewer",
    })
    assert res.status_code == 201
    incident = res.json()

    # Viewer CANNOT change status
    res = client.patch(f"/api/v1/incidents/{incident['id']}",
                       json={"status": "on_site"}, headers={"X-Role": "viewer"})
    assert res.status_code == 403

    # Operator CAN change status
    res = client.patch(f"/api/v1/incidents/{incident['id']}",
                       json={"status": "on_site"}, headers={"X-Role": "operator"})
    assert res.status_code == 200
    assert res.json()["status"] == "on_site"

    # It appears in the list
    res = client.get("/api/v1/incidents")
    assert any(i["id"] == incident["id"] for i in res.json()["incidents"])


def test_assignment_flow():
    inc = client.post("/api/v1/incidents", json={
        "title": "Blocked drain at Beta 2 market", "latitude": 28.4870,
        "longitude": 77.5160, "severity": "medium",
    }).json()
    team = client.get("/api/v1/teams").json()["teams"][0]

    # Viewer cannot assign
    res = client.post("/api/v1/assignments", json={
        "incident_id": inc["id"], "team_id": team["id"],
    }, headers={"X-Role": "viewer"})
    assert res.status_code == 403

    # Operator assigns -> incident becomes 'assigned'
    res = client.post("/api/v1/assignments", json={
        "incident_id": inc["id"], "team_id": team["id"], "assigned_by": "demo-operator",
    }, headers={"X-Role": "operator"})
    assert res.status_code == 201
    updated = client.get("/api/v1/incidents").json()["incidents"]
    mine = next(i for i in updated if i["id"] == inc["id"])
    assert mine["status"] == "assigned"


def test_scenario_simulator():
    res = client.post("/api/v1/scenarios/run", json={"rainfall_mm": 90, "hours": 3})
    assert res.status_code == 200
    body = res.json()
    assert body["is_simulated"] is True
    ranking = body["ranking"]
    assert len(ranking) >= 5
    assert all(r["confidence"] == "Medium" for r in ranking)
    # Higher simulated rainfall must never rank below lower rainfall for the same zone
    res2 = client.post("/api/v1/scenarios/run", json={"rainfall_mm": 10, "hours": 3})
    low = {r["zone_id"]: r["risk_score"] for r in res2.json()["ranking"]}
    for r in ranking:
        assert r["risk_score"] >= low[r["zone_id"]]


def test_scenario_retrievable():
    created = client.post("/api/v1/scenarios/run", json={"rainfall_mm": 45}).json()
    res = client.get(f"/api/v1/scenarios/{created['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == created["id"]
