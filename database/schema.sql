-- Urban Flood Command System — initial Supabase migration
-- Run in: Supabase Dashboard -> SQL Editor
-- PostGIS is enabled in the dedicated "extensions" schema per Supabase docs.

create extension if not exists postgis with schema extensions;

-- 2. User profiles (extends Supabase Auth)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    role text not null default 'viewer'
        check (role in ('viewer', 'operator', 'admin')),
    created_at timestamptz default now()
);

-- 3. Monitoring zones (Greater Noida pilot)
-- terrain_score / drainage_score are MANUALLY CONFIGURED demonstration values,
-- not field measurements.
create table if not exists public.zones (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    center_lat double precision not null,
    center_lng double precision not null,
    terrain_score double precision not null default 50,
    drainage_score double precision not null default 50,
    created_at timestamptz default now()
);

-- 4. Weather observations (Open-Meteo model output + simulated entries)
create table if not exists public.weather_observations (
    id uuid primary key default gen_random_uuid(),
    zone_id uuid references public.zones(id),
    source text not null,
    observed_at timestamptz not null,
    precipitation_mm double precision,
    precipitation_probability double precision,
    temperature_c double precision,
    is_simulated boolean default false,
    raw_data jsonb,
    created_at timestamptz default now()
);

-- 5. Incidents (waterlogging reports)
create table if not exists public.incidents (
    id uuid primary key default gen_random_uuid(),
    zone_id uuid references public.zones(id),
    reported_by_name text,
    title text not null,
    description text,
    latitude double precision not null,
    longitude double precision not null,
    location extensions.geography(Point, 4326),
    severity text default 'medium'
        check (severity in ('low', 'medium', 'high', 'critical')),
    status text default 'new'
        check (status in ('new', 'assigned', 'on_site', 'resolved')),
    verified boolean default false,
    is_simulated boolean default false,
    source text default 'user_report',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Auto-populate the PostGIS location column from lat/lng on every insert.
create or replace function public.set_incident_location()
returns trigger language plpgsql as $$
begin
    new.location := ST_SetSRID(ST_MakePoint(new.longitude, new.latitude), 4326)::extensions.geography;
    return new;
end $$;

drop trigger if exists trg_incident_location on public.incidents;
create trigger trg_incident_location
    before insert or update of latitude, longitude on public.incidents
    for each row execute function public.set_incident_location();

-- 6. Response teams
create table if not exists public.response_teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    contact_name text,
    contact_phone text,
    availability text default 'available'
        check (availability in ('available', 'busy', 'offline')),
    created_at timestamptz default now()
);

-- 7. Assignments (incident -> team)
create table if not exists public.response_assignments (
    id uuid primary key default gen_random_uuid(),
    incident_id uuid not null references public.incidents(id),
    team_id uuid not null references public.response_teams(id),
    assigned_by text,
    notes text,
    assigned_at timestamptz default now()
);

-- 8. Risk assessment history (explainable snapshots)
create table if not exists public.risk_assessments (
    id uuid primary key default gen_random_uuid(),
    zone_id uuid references public.zones(id),
    rainfall_score double precision not null,
    terrain_score double precision not null,
    drainage_score double precision not null,
    incident_score double precision not null,
    risk_score double precision not null,
    risk_level text not null,
    confidence text not null,
    is_simulated boolean default false,
    explanation jsonb,
    created_at timestamptz default now()
);

-- 9. Audit events
create table if not exists public.audit_events (
    id uuid primary key default gen_random_uuid(),
    event text not null,
    actor text,
    detail text,
    created_at timestamptz default now()
);

-- Spatial + time indexes
create index if not exists incidents_location_idx on public.incidents using gist(location);
create index if not exists incidents_created_idx on public.incidents(created_at desc);
create index if not exists weather_zone_time_idx on public.weather_observations(zone_id, observed_at desc);
create index if not exists risk_zone_time_idx on public.risk_assessments(zone_id, created_at desc);

-- Row Level Security (baseline policies for the demo)
alter table public.profiles enable row level security;
alter table public.zones enable row level security;
alter table public.weather_observations enable row level security;
alter table public.incidents enable row level security;
alter table public.response_teams enable row level security;
alter table public.response_assignments enable row level security;
alter table public.risk_assessments enable row level security;

-- Authenticated users can read dashboard data
create policy "zones readable" on public.zones
    for select to authenticated using (true);
create policy "incidents readable" on public.incidents
    for select to authenticated using (true);
create policy "teams readable" on public.response_teams
    for select to authenticated using (true);
create policy "assignments readable" on public.response_assignments
    for select to authenticated using (true);
create policy "risk readable" on public.risk_assessments
    for select to authenticated using (true);
create policy "weather readable" on public.weather_observations
    for select to authenticated using (true);

-- Authenticated users can create incidents
create policy "incidents insertable" on public.incidents
    for insert to authenticated with check (true);

-- Realtime: broadcast incident changes to all authenticated clients.
-- (Run once; if it errors with "already member", that is fine.)
do $$
begin
    alter publication supabase_realtime add table public.incidents;
exception when duplicate_object then
    null;
end $$;
