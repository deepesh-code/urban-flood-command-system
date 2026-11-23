-- Urban Flood Command System — seed data (idempotent, safe to re-run)
-- Zones use FIXED UUIDs so references stay stable.
-- Terrain / drainage scores are documented demonstration configurations.

insert into public.zones (id, name, center_lat, center_lng, terrain_score, drainage_score) values
    ('11111111-1111-4111-8111-111111111111', 'Pari Chowk',          28.4657, 77.5025, 72, 55),
    ('22222222-2222-4222-8222-222222222222', 'Knowledge Park',      28.4725, 77.4840, 80, 48),
    ('33333333-3333-4333-8333-333333333333', 'Alpha 1',             28.4793, 77.5083, 60, 62),
    ('44444444-4444-4444-8444-444444444444', 'Beta 2',              28.4870, 77.5160, 55, 70),
    ('55555555-5555-4555-8555-555555555555', 'Gamma 1',             28.4930, 77.5030, 65, 60),
    ('66666666-6666-4666-8666-666666666666', 'Greater Noida West',  28.5270, 77.4530, 75, 52)
on conflict (name) do nothing;

insert into public.response_teams (name, contact_name, contact_phone) values
    ('Municipal Quick Response Unit 1', 'R. Verma',  '+91-98100-10001'),
    ('Municipal Quick Response Unit 2', 'S. Singh',  '+91-98100-10002'),
    ('Drainage Desilting Crew',        'M. Ansari', '+91-98100-10003'),
    ('Traffic & Barricade Team',       'P. Kumar',  '+91-98100-10004')
on conflict do nothing;

-- Sample incidents for the demo map. ALL are flagged is_simulated = true,
-- so the dashboard honestly labels them as simulated reports.
insert into public.incidents
    (zone_id, title, description, latitude, longitude, severity, status, is_simulated, source, reported_by_name)
values
    ('22222222-2222-4222-8222-222222222222',
     'Waterlogging near Knowledge Park roundabout',
     'Road submerged after sustained rain; traffic moving on one lane.',
     28.4725, 77.4840, 'high', 'new', true, 'simulated_demo', 'demo-seed'),
    ('11111111-1111-4111-8111-111111111111',
     'Underpass water accumulation at Pari Chowk',
     'Underpass closed to light vehicles. Desilting requested.',
     28.4657, 77.5025, 'critical', 'new', true, 'simulated_demo', 'demo-seed'),
    ('44444444-4444-4444-8444-444444444444',
     'Blocked storm drain in Beta 2 market area',
     'Reports of backflow from a blocked drain near the market.',
     28.4870, 77.5160, 'medium', 'new', true, 'simulated_demo', 'demo-seed');
