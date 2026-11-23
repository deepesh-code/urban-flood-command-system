"""Data access layer.

One interface, two backends:
  - Supabase PostgreSQL (when SUPABASE_URL + service key are configured)
  - Embedded SQLite (automatic fallback — zero-config demo mode)

All functions return plain dictionaries so the API layer never needs to
know which backend is active.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import settings

# ---------------------------------------------------------------------------
# Greater Noida pilot zones. Terrain / drainage scores are MANUALLY configured
# demonstration values (documented, not measured) — the project brief is
# explicit that we do not claim real drainage-capacity measurements.
# ---------------------------------------------------------------------------
SEED_ZONES = [
    {"name": "Pari Chowk",        "center_lat": 28.4657, "center_lng": 77.5025, "terrain_score": 72, "drainage_score": 55},
    {"name": "Knowledge Park",    "center_lat": 28.4725, "center_lng": 77.4840, "terrain_score": 80, "drainage_score": 48},
    {"name": "Alpha 1",           "center_lat": 28.4793, "center_lng": 77.5083, "terrain_score": 60, "drainage_score": 62},
    {"name": "Beta 2",            "center_lat": 28.4870, "center_lng": 77.5160, "terrain_score": 55, "drainage_score": 70},
    {"name": "Gamma 1",           "center_lat": 28.4930, "center_lng": 77.5030, "terrain_score": 65, "drainage_score": 60},
    {"name": "Greater Noida West", "center_lat": 28.5270, "center_lng": 77.4530, "terrain_score": 75, "drainage_score": 52},
]

SEED_TEAMS = [
    {"name": "Municipal Quick Response Unit 1", "contact_name": "R. Verma",  "contact_phone": "+91-98100-10001"},
    {"name": "Municipal Quick Response Unit 2", "contact_name": "S. Singh",  "contact_phone": "+91-98100-10002"},
    {"name": "Drainage Desilting Crew",          "contact_name": "M. Ansari", "contact_phone": "+91-98100-10003"},
    {"name": "Traffic & Barricade Team",         "contact_name": "P. Kumar",  "contact_phone": "+91-98100-10004"},
]

_conn: sqlite3.Connection | None = None
_supabase_client = None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# SQLite backend
# ---------------------------------------------------------------------------

def _sqlite() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(settings.database_path, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _init_sqlite(_conn)
    return _conn


def _init_sqlite(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS zones (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            center_lat REAL NOT NULL,
            center_lng REAL NOT NULL,
            terrain_score REAL NOT NULL DEFAULT 50,
            drainage_score REAL NOT NULL DEFAULT 50,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            zone_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            severity TEXT NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('low','medium','high','critical')),
            status TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','assigned','on_site','resolved')),
            verified INTEGER NOT NULL DEFAULT 0,
            is_simulated INTEGER NOT NULL DEFAULT 0,
            source TEXT NOT NULL DEFAULT 'user_report',
            reported_by_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS response_teams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_name TEXT,
            contact_phone TEXT,
            availability TEXT NOT NULL DEFAULT 'available'
                CHECK (availability IN ('available','busy','offline')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS response_assignments (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL REFERENCES incidents(id),
            team_id TEXT NOT NULL REFERENCES response_teams(id),
            assigned_by TEXT,
            notes TEXT,
            assigned_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id TEXT PRIMARY KEY,
            zone_id TEXT,
            rainfall_score REAL NOT NULL,
            terrain_score REAL NOT NULL,
            drainage_score REAL NOT NULL,
            incident_score REAL NOT NULL,
            risk_score REAL NOT NULL,
            risk_level TEXT NOT NULL,
            confidence TEXT NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 0,
            explanation TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit_events (
            id TEXT PRIMARY KEY,
            event TEXT NOT NULL,
            actor TEXT,
            detail TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    # Seed zones and teams once
    if cur.execute("SELECT COUNT(*) AS c FROM zones").fetchone()["c"] == 0:
        for z in SEED_ZONES:
            cur.execute(
                "INSERT INTO zones (id, name, center_lat, center_lng, terrain_score, drainage_score, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), z["name"], z["center_lat"], z["center_lng"],
                 z["terrain_score"], z["drainage_score"], _now()),
            )
    if cur.execute("SELECT COUNT(*) AS c FROM response_teams").fetchone()["c"] == 0:
        for t in SEED_TEAMS:
            cur.execute(
                "INSERT INTO response_teams (id, name, contact_name, contact_phone, availability, created_at)"
                " VALUES (?, ?, ?, ?, 'available', ?)",
                (str(uuid.uuid4()), t["name"], t["contact_name"], t["contact_phone"], _now()),
            )
    conn.commit()


def _rows(cur: sqlite3.Cursor) -> list[dict[str, Any]]:
    return [dict(r) for r in cur.fetchall()]


# ---------------------------------------------------------------------------
# Supabase backend
# ---------------------------------------------------------------------------

def _supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client  # imported lazily: heavy dependency

        _supabase_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _supabase_client


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def backend_name() -> str:
    return "supabase" if settings.use_supabase else "sqlite"


def audit(event: str, actor: str | None, detail: str) -> None:
    if settings.use_supabase:
        _supabase().table("audit_events").insert(
            {"event": event, "actor": actor, "detail": detail, "created_at": _now()}
        ).execute()
    else:
        conn = _sqlite()
        conn.execute(
            "INSERT INTO audit_events (id, event, actor, detail, created_at) VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), event, actor, detail, _now()),
        )
        conn.commit()


def list_zones() -> list[dict[str, Any]]:
    if settings.use_supabase:
        res = _supabase().table("zones").select("*").order("name").execute()
        return res.data or []
    conn = _sqlite()
    return _rows(conn.execute("SELECT * FROM zones ORDER BY name"))


def list_incidents(status: str | None = None) -> list[dict[str, Any]]:
    if settings.use_supabase:
        q = _supabase().table("incidents").select("*").order("created_at", desc=True)
        if status:
            q = q.eq("status", status)
        return q.execute().data or []
    conn = _sqlite()
    if status:
        return _rows(conn.execute(
            "SELECT * FROM incidents WHERE status = ? ORDER BY created_at DESC", (status,)
        ))
    return _rows(conn.execute("SELECT * FROM incidents ORDER BY created_at DESC"))


def create_incident(data: dict[str, Any]) -> dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "zone_id": data.get("zone_id"),
        "title": data["title"],
        "description": data.get("description"),
        "latitude": float(data["latitude"]),
        "longitude": float(data["longitude"]),
        "severity": data.get("severity", "medium"),
        "status": "new",
        "verified": bool(data.get("verified", False)),
        "is_simulated": bool(data.get("is_simulated", False)),
        "source": data.get("source", "user_report"),
        "reported_by_name": data.get("reported_by"),
        "created_at": _now(),
        "updated_at": _now(),
    }
    if settings.use_supabase:
        _supabase().table("incidents").insert(record).execute()
    else:
        conn = _sqlite()
        conn.execute(
            "INSERT INTO incidents (id, zone_id, title, description, latitude, longitude,"
            " severity, status, verified, is_simulated, source, reported_by_name, created_at, updated_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (record["id"], record["zone_id"], record["title"], record["description"],
             record["latitude"], record["longitude"], record["severity"], record["status"],
             int(record["verified"]), int(record["is_simulated"]), record["source"],
             record["reported_by_name"], record["created_at"], record["updated_at"]),
        )
        conn.commit()
    audit("incident_created", record["reported_by_name"], f"Incident '{record['title']}' created ({record['severity']})")
    return record


def get_incident(incident_id: str) -> dict[str, Any] | None:
    if settings.use_supabase:
        res = _supabase().table("incidents").select("*").eq("id", incident_id).execute()
        return (res.data or [None])[0]
    conn = _sqlite()
    row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    return dict(row) if row else None


def update_incident_status(incident_id: str, status: str, actor: str | None) -> dict[str, Any] | None:
    if settings.use_supabase:
        _supabase().table("incidents").update(
            {"status": status, "updated_at": _now()}
        ).eq("id", incident_id).execute()
    else:
        conn = _sqlite()
        conn.execute(
            "UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?",
            (status, _now(), incident_id),
        )
        conn.commit()
    audit("incident_status_changed", actor, f"Incident {incident_id} -> {status}")
    return get_incident(incident_id)


def list_teams() -> list[dict[str, Any]]:
    if settings.use_supabase:
        return _supabase().table("response_teams").select("*").order("name").execute().data or []
    conn = _sqlite()
    return _rows(conn.execute("SELECT * FROM response_teams ORDER BY name"))


def set_team_availability(team_id: str, availability: str) -> dict[str, Any] | None:
    if settings.use_supabase:
        _supabase().table("response_teams").update({"availability": availability}).eq("id", team_id).execute()
        res = _supabase().table("response_teams").select("*").eq("id", team_id).execute()
        return (res.data or [None])[0]
    conn = _sqlite()
    conn.execute("UPDATE response_teams SET availability = ? WHERE id = ?", (availability, team_id))
    conn.commit()
    row = conn.execute("SELECT * FROM response_teams WHERE id = ?", (team_id,)).fetchone()
    return dict(row) if row else None


def create_assignment(data: dict[str, Any]) -> dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "incident_id": data["incident_id"],
        "team_id": data["team_id"],
        "assigned_by": data.get("assigned_by"),
        "notes": data.get("notes"),
        "assigned_at": _now(),
    }
    if settings.use_supabase:
        _supabase().table("response_assignments").insert(record).execute()
    else:
        conn = _sqlite()
        conn.execute(
            "INSERT INTO response_assignments (id, incident_id, team_id, assigned_by, notes, assigned_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (record["id"], record["incident_id"], record["team_id"],
             record["assigned_by"], record["notes"], record["assigned_at"]),
        )
        conn.commit()
    # Assigning a team moves the incident out of the unassigned queue.
    update_incident_status(record["incident_id"], "assigned", record["assigned_by"])
    return record


def list_assignments() -> list[dict[str, Any]]:
    if settings.use_supabase:
        return _supabase().table("response_assignments").select("*").order("assigned_at", desc=True).execute().data or []
    conn = _sqlite()
    return _rows(conn.execute("SELECT * FROM response_assignments ORDER BY assigned_at DESC"))


def save_risk_assessment(zone_id: str | None, result: dict[str, Any]) -> dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "zone_id": zone_id,
        "rainfall_score": result["inputs"]["rainfall"],
        "terrain_score": result["inputs"]["terrain"],
        "drainage_score": result["inputs"]["drainage"],
        "incident_score": result["inputs"]["incident"],
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "is_simulated": result["is_simulated"],
        "explanation": json.dumps(result["explanation"]),
        "created_at": _now(),
    }
    if settings.use_supabase:
        _supabase().table("risk_assessments").insert(record).execute()
    else:
        conn = _sqlite()
        conn.execute(
            "INSERT INTO risk_assessments (id, zone_id, rainfall_score, terrain_score, drainage_score,"
            " incident_score, risk_score, risk_level, confidence, is_simulated, explanation, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (record["id"], record["zone_id"], record["rainfall_score"], record["terrain_score"],
             record["drainage_score"], record["incident_score"], record["risk_score"], record["risk_level"],
             record["confidence"], int(record["is_simulated"]), record["explanation"], record["created_at"]),
        )
        conn.commit()
    return record


def latest_risk_per_zone() -> dict[str, dict[str, Any]]:
    """Return {zone_id: latest assessment} for every zone that has one."""
    if settings.use_supabase:
        res = _supabase().table("risk_assessments").select("*").order("created_at", desc=True).execute()
        latest: dict[str, dict[str, Any]] = {}
        for row in res.data or []:
            zid = row.get("zone_id")
            if zid and zid not in latest:
                latest[zid] = row
        return latest
    conn = _sqlite()
    rows = _rows(conn.execute(
        "SELECT * FROM risk_assessments ORDER BY created_at DESC"
    ))
    latest = {}
    for row in rows:
        zid = row.get("zone_id")
        if zid and zid not in latest:
            latest[zid] = row
    return latest


def list_audit(limit: int = 50) -> list[dict[str, Any]]:
    if settings.use_supabase:
        return _supabase().table("audit_events").select("*").order("created_at", desc=True).limit(limit).execute().data or []
    conn = _sqlite()
    return _rows(conn.execute("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?", (limit,)))
