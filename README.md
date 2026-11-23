# Urban Flood Command System

**AI Flood Risk & Emergency Coordination — Greater Noida pilot**

A working, demonstrable decision-support prototype: one command view that
combines real weather data, an explainable flood-risk score, incident
reporting, a what-if scenario simulator and operator-approved response
management.

> Honest scope: this is a credible decision-support MVP. It does **not**
> claim city-wide operational flood prediction, real sensor coverage, or a
> trained ML model. Real data (Open-Meteo), database-stored reports and
> simulated scenarios are always clearly labelled as such.

---

## What a judge can do with it

1. Open a live Greater Noida map (Leaflet + OpenStreetMap).
2. View **real** rainfall/weather data (Open-Meteo API, labelled as a model forecast).
3. Submit a waterlogging incident — it persists in the database and appears on the map.
4. Drag a rainfall slider in the scenario simulator and watch hotspot risk scores recalculate.
5. See **why** each zone scores what it scores (contribution breakdown per input).
6. Assign an incident to a response team and update its status (operator only).
7. Open a **second browser** and see updates appear in near real time
   (Supabase Realtime when configured; 5-second polling otherwise).
8. Try the same action as **Viewer** and be denied with a 403 — permission
   differences are demonstrable.

## Technology stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | Next.js 14 + TypeScript + Tailwind |
| Map        | Leaflet + OpenStreetMap           |
| Charts     | Recharts                          |
| Backend    | Python + FastAPI                |
| Risk engine| Rule-based, explainable weighted score |
| Database   | Supabase PostgreSQL + PostGIS     |
| Live updates | Supabase Realtime + polling fallback |
| Weather    | Open-Meteo API (free, keyless)    |
| Deployment | Vercel (frontend) + any FastAPI host (backend) |

**Zero-config guarantee:** if Supabase environment variables are not set, the
backend automatically uses an embedded SQLite database. The demo always runs.

## Repository layout

```
Urban-Flood-Command-System/
├── frontend/          # Next.js app (dashboard, incidents, simulator, teams)
├── backend/           # FastAPI app (risk engine, weather, incidents, scenarios)
│   └── app/tests/     # 20 automated tests (pytest)
├── database/          # Supabase schema.sql + seed.sql
├── demo/              # offline-demo.html — zero-install backup demo
└── docs/              # demo script, deployment guide, architecture
```

## Quick start (local, 5 minutes)

Requirements: Node.js 18+, Python 3.10+.

**Terminal 1 — backend:**

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows PowerShell
# source .venv/bin/activate         # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — that's it. No database setup needed for the
local demo (SQLite fallback is automatic). Add Supabase variables later for
shared cloud data + realtime (see `docs/deployment.md`).

Useful links while running:
- API health: http://localhost:8000/health
- Interactive API docs (Swagger): http://localhost:8000/docs
- Frontend: http://localhost:3000/dashboard

## Run the tests

```bash
cd backend
pytest app/tests/ -v     # 20 tests: risk math, API, permissions, scenarios
```

## The risk engine (explainable by design)

```
R = 0.35 × P  (rainfall indicator, normalized from Open-Meteo accumulation)
  + 0.25 × T  (terrain / low-elevation indicator, documented zone config)
  + 0.20 × D  (drainage indicator, documented zone config)
  + 0.20 × I  (open incident evidence: severity points, verified × 1.5)
```

All inputs are normalized to 0–100. Levels: Low < 30, Medium < 60, High < 85,
Severe ≥ 85. Every assessment stores its per-input contribution breakdown,
so the UI shows the evidence behind each ranking. Rainfall normalization:
`rain_input = min(100, accumulated_mm / 60 × 100)`.

## Roles

| Role     | Can do                                          |
|----------|-------------------------------------------------|
| Viewer   | Read everything; **cannot** assign or change status (403) |
| Operator | Assign teams, change incident status, update team availability |
| Admin    | Everything the operator can do                  |

The demo passes the role in an `X-Role` header (UI switcher in the navbar).
A production system would verify a real Supabase Auth session instead — this
is intentionally simple so permission differences are easy to demonstrate.

## Deployment

See `docs/deployment.md` for step-by-step Supabase + Vercel + backend
hosting instructions (free tiers), including the optional
[Lovable](https://lovable.dev) route for regenerating UI variations.

## Data honesty

- Weather: Open-Meteo **model forecast** — always labelled, never presented
  as a rain-gauge reading.
- Incidents from the demo seed: flagged `is_simulated = true`.
- Scenario simulator results: flagged `is_simulated = true` with "Simulated"
  badges in the UI.
- Zone terrain/drainage scores: manually configured demonstration values,
  documented in `database/seed.sql`.
