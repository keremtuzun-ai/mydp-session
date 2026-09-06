-- Sessions roll forward on their own (see src/lib/data/rolling-sessions.ts):
-- one row per start instant so the generator can upsert without duplicates.
create unique index if not exists weekly_sessions_starts_at_key on public.weekly_sessions (starts_at);
