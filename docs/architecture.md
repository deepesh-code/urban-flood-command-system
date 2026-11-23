# Architecture

```
┌────────────────┐   ┌──────────────────┐   ┌─────────────────────┐
│  Input sources │   │  Intake/Validate │   │  Spatial store +    │
│  Open-Meteo    │──▶│  FastAPI          │──▶│  scoring (Supabase  │
│  user reports  │   │  (this backend)  │   │  PG/PostGIS)        │
└────────────────┘   └──────────────────┘   └──────────┬──────────┘
                                                         │
┌────────────────────────────────────────────────────────┼──────────┐
│                   Operator view (Next.js + Leaflet)    │          │
│  dashboard · incidents · simulator · teams             ▼          │
│        ┌──────────────────────────────────────────────┐          │
│        │  Access review: map, evidence, explainability  │          │
│        └──────────────────────┬───────────────────────┘          │
│                                 ▼                                  │
│        ┌──────────────────────────────────────────────┐          │
│        │  Response + audit: role-checked assignment,   │          │
│        │  status transitions, audit trail              │          │
│        └──────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

## Service boundaries

| Boundary | Responsibility |
|---|---|
| `app/services/risk_engine.py` | Pure math. Same inputs → same score. No I/O. |
| `app/services/weather_service.py` | Open-Meteo fetch + 5-min cache + rainfall normalization. |
| `app/db.py` | Data access. Supabase when configured, SQLite fallback. |
| `app/api/*` | HTTP layer, validation, role enforcement. |
| Frontend `src/components/MapView.tsx` | Map only — never contains risk math (per project rule). |

## API contract (v1)

| Method | Endpoint | Purpose | Role |
|---|---|---|---|
| GET | `/health` | Backend status | all |
| GET | `/api/v1/weather` | Open-Meteo current + hourly for a zone/point | all |
| GET | `/api/v1/zones` | Zones with latest risk + open incident count | all |
| GET | `/api/v1/incidents` | List incidents (`?status=`) | all |
| POST | `/api/v1/incidents` | Create incident | all (authenticated) |
| PATCH | `/api/v1/incidents/{id}` | Change status | operator/admin |
| GET | `/api/v1/teams` | List response teams | all |
| PATCH | `/api/v1/teams/{id}` | Set availability | operator/admin |
| GET | `/api/v1/assignments` | Assignment/audit list | all |
| POST | `/api/v1/assignments` | Assign team (sets incident → assigned) | operator/admin |
| POST | `/api/v1/risk/calculate` | Explainable score from 4 inputs | all |
| POST | `/api/v1/risk/refresh` | Recompute all zones from live weather + incidents | all |
| GET | `/api/v1/risk` / `/api/v1/risk/{zone_id}` | Latest stored assessments | all |
| POST | `/api/v1/scenarios/run` | What-if simulation (labelled simulated) | all |
| GET | `/api/v1/scenarios/{id}` | Retrieve scenario results | all |

## Key design decisions

1. **Risk math lives only on the backend.** Deterministic, unit-tested,
   reusable by any client.
2. **Supabase with automatic SQLite fallback.** Zero-config local demo;
   cloud mode by adding two env vars. No logic forks in the API layer.
3. **Polling + Realtime.** Polling (5 s) always runs; Supabase Realtime
   adds instant push when configured. Two-browser demos work either way.
4. **Everything simulated is labelled.** `is_simulated` flags flow from
   backend → UI badges (seed data, scenario results).
5. **Weather outage never breaks the demo.** Risk refresh catches weather
   errors and continues with the remaining inputs.
6. **Demo role header.** `X-Role` lets you demonstrate permission
   differences without a login flow; swapping in Supabase Auth later
   doesn't change the API contract.
