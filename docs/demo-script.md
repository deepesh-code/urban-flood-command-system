# Demo Script — 6-minute demonstration

Rehearse this once end-to-end before presenting. Every step was verified
working; the fallback options cover every failure mode.

**Before you start:**
- Backend running (`uvicorn app.main:app --port 8000`)
- Frontend running (`npm run dev` in `frontend/`)
- Two browser windows open (e.g. Chrome normal + Incognito) at
  `http://localhost:3000/dashboard`
- If presenting on a projector without internet: use
  `demo/offline-demo.html` (double-click, works 100% offline).

---

## 1. Opening (30 s)

> "Urban flooding response fails when evidence is fragmented — rainfall in
> one app, complaints in another, no shared map, no clear ownership. Our
> system puts weather, hotspot risk, field reports and response teams in one
> command view for Greater Noida. The risk score is fully explainable —
> you can see exactly why a zone ranks where it does."

Open the dashboard. Point out: stat cards, live map, weather panel.

## 2. Real weather data (45 s)

- Point to the weather panel: temperature and precipitation are **live
  from Open-Meteo** — note the source label and retrieval timestamp.
- Say: "This is a weather model forecast, not a sensor; the UI always labels
  it as such — data honesty is a design requirement."
- Click **"Recompute risk from live weather"** — the hotspot ranking
  refreshes from the real 3-hour rainfall forecast.

## 3. Explainable risk ranking (60 s)

- Open a RiskCard (e.g. Knowledge Park): "Score = 0.35×rainfall +
  0.25×terrain + 0.20×drainage + 0.20×incidents. Each contribution is shown
  here. Terrain and drainage are documented configuration values for the
  pilot zones — we don't claim street-level measurements."
- If it's a dry day (likely): "Today the model forecasts no rain, so all
  zones are Low — which is exactly why we built the simulator."

## 4. Scenario simulator (90 s) — the highlight

- Go to **Scenario Simulator**.
- Drag rainfall to **90 mm / 3 h** → Run scenario.
- "Watch the ranking: Knowledge Park jumps to High risk because of its low
  drainage score. Every result is labelled Simulated — the same engine, the
  same weights, only the rainfall input changes. Same input, same output —
  it's fully deterministic."
- Drag to 200 mm and re-run to show Severe levels.

## 5. Incident reporting + map (60 s)

- Go to **Incidents**, submit: "Waterlogging near Pari Chowk underpass",
  severity High.
- Switch to the dashboard: the new incident dot appears on the map, and the
  zone incident contribution increases (recompute risk to show it).

## 6. Two-browser live update (60 s)

- In browser B (Incognito), watch the incident queue.
- In browser A, submit another incident → it appears in browser B within
  ~5 seconds (polling; instant if Supabase Realtime is configured).
- "Updates propagate live, so a control room and a field coordinator always
  see the same queue."

## 7. Permissions + response (90 s)

- In browser B set role **Operator**; in browser A stay **Viewer**.
- Viewer clicks "Resolve" → **403 error / read-only note**. "Viewers can
  inspect but never act."
- Operator: **Assign team** on the Pari Chowk incident → status changes to
  `assigned`; go to **Response Teams** — the assignment appears in the audit
  log, team becomes Busy.
- Operator marks it **on site**, then **resolved** → the map dot disappears.

## 8. Close (30 s)

> "We deliberately did not fake an AI model: the rule engine is transparent,
> every score carries its evidence, simulated data is labelled, and every
> operator action is audited. That's what makes it usable as decision
> support. Next phase: verified labels per storm event to train and validate
> an XGBoost model with whole-storm holdout."

## If something goes wrong (contingency)

| Symptom                              | Fix / fallback |
|--------------------------------------|----------------|
| Map tiles not loading (no internet)  | Schematic map still shows zones/incidents; use offline demo |
| Backend not started                  | `demo/offline-demo.html` double-click — full logic demo |
| Vercel URL fails at the venue        | Run locally (steps above); record a backup screen capture beforehand |
| Open-Meteo down                      | Backend serves cached copy (5 min); risk recompute falls back gracefully |
| Forgot Supabase env vars             | SQLite mode works with zero configuration |
