# Deployment Guide — Supabase + Vercel (free tiers)

Everything below uses free plans. Total setup time: ~30–45 minutes.

---

## Step 1 — Supabase project (database + realtime)

1. Go to https://supabase.com → **New project**.
   - Name: `urban-flood-command`
   - Database password: generate a strong one, save it.
   - Region: `Mumbai (South Asia)` is closest to Greater Noida.
2. Open **SQL Editor** → paste the full contents of
   `database/schema.sql` → **Run**. Repeat with `database/seed.sql`.
   This creates all tables, the PostGIS location trigger, RLS policies and
   realtime publication.
3. Get your keys: **Project Settings → API**
   - `Project URL` → you need it twice below.
   - `anon public` key → for the frontend.
   - `service_role` key → **backend only. Never put it in any
     NEXT_PUBLIC_ variable or in GitHub.**

## Step 2 — Backend hosting (FastAPI)

The backend must be publicly reachable. Easiest free options:

### Option A — Render (recommended, free)
1. Push this repository to GitHub.
2. https://render.com → **New → Web Service** → connect the repo.
3. Configure:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Environment variables:**
   ```
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        (service_role key)
   FRONTEND_URL=https://YOUR-APP.vercel.app
   ```
5. Deploy. Note the URL: `https://your-api.onrender.com`.
   Free tier sleeps after inactivity — first request takes ~30 s (acceptable
   for a demo; mention it if the judge notices).

### Option B — Railway / Fly.io / Hugging Face Spaces
Same idea: run uvicorn, set the same three environment variables.

### Verify
```
curl https://your-api.onrender.com/health
# -> {"status":"healthy", ... "backend":"supabase"}
```
When it says `"backend":"supabase"`, your cloud database is live.

## Step 3 — Frontend hosting (Vercel)

1. https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Configure:
   - **Root directory:** `frontend`
   - **Framework preset:** Next.js (auto-detected)
3. **Environment variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-api.onrender.com
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   (anon key, NOT service_role)
   ```
4. Deploy. You get `https://your-app.vercel.app`.

> If you skip the Supabase variables, the app still works: the frontend
> polls the backend and the backend uses SQLite on the host (data resets
> on redeploy, but nothing breaks).

## Step 4 — Optional: Lovable

If you want to iterate on the UI with [Lovable](https://lovable.dev)
(AI-assisted app builder): import your GitHub repo there, prompt for design
variations (e.g. "make the dashboard a light theme with a larger map"),
then merge the generated changes back. Keep the API contract in
`docs/architecture.md` unchanged so the backend keeps working. Treat
Lovable as a UI accelerator — the risk engine and data layer stay in this
repo.

## Step 5 — Demo accounts for permissions

The role is chosen in the navbar switcher (viewer/operator/admin), so you
don't need real logins to demonstrate permissions. If you later add Supabase
Auth (future work), map `auth.users` rows to `profiles.role`.

## Checklist before demo day

- [ ] `https://your-app.vercel.app` loads on your phone (hotspot, no venue Wi-Fi assumptions)
- [ ] Risk recompute button updates the ranking
- [ ] Incident submitted on one device appears on another within seconds
- [ ] Viewer gets 403 on status change; Operator succeeds
- [ ] Record a 2-minute screen capture of the whole flow as backup
- [ ] `demo/offline-demo.html` copied to a USB stick as the last-resort demo
- [ ] No `.env` file committed to GitHub (check `git status`)
