-- Tally records. Every speech, POI and objection the desk counts is kept as
-- its own timestamped entry, so each task's tally stays documented after a
-- new task resets the live board.

create table public.task_tally_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  country_key text not null,
  country text not null,
  kind text not null check (kind in ('speeches', 'pois', 'objections')),
  delta integer not null check (delta in (-1, 1)),
  total_after integer not null check (total_after >= 0),
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index task_tally_events_task_idx on public.task_tally_events (task_id, recorded_at);
alter table public.task_tally_events enable row level security;
create policy "task_tally_events_select" on public.task_tally_events for select to authenticated using (public.is_staff());
create policy "task_tally_events_insert" on public.task_tally_events for insert to authenticated with check (public.is_staff() and recorded_by = auth.uid());

-- Same atomic step as 0018, now also writing the entry (only when the count really moved).
create or replace function public.bump_tally(t uuid, k text, label text, kind text, delta integer)
returns public.task_tallies
language plpgsql security invoker set search_path = public as $$
declare
  s integer := case when kind = 'speeches' then delta else 0 end;
  p integer := case when kind = 'pois' then delta else 0 end;
  o integer := case when kind = 'objections' then delta else 0 end;
  before_row public.task_tallies;
  result public.task_tallies;
  before_n integer;
  after_n integer;
begin
  if not public.is_staff() then
    raise exception 'Only the executive desk can tally' using errcode = '42501';
  end if;
  if kind not in ('speeches', 'pois', 'objections') or delta not in (-1, 1) then
    raise exception 'Invalid tally step' using errcode = '22023';
  end if;
  select * into before_row from public.task_tallies where task_id = t and country_key = k for update;
  insert into public.task_tallies as x (task_id, country_key, country, speeches, pois, objections)
  values (t, k, label, greatest(s, 0), greatest(p, 0), greatest(o, 0))
  on conflict (task_id, country_key) do update set
    speeches = greatest(x.speeches + s, 0),
    pois = greatest(x.pois + p, 0),
    objections = greatest(x.objections + o, 0),
    updated_at = now()
  returning * into result;
  before_n := coalesce(case kind when 'speeches' then before_row.speeches when 'pois' then before_row.pois else before_row.objections end, 0);
  after_n := case kind when 'speeches' then result.speeches when 'pois' then result.pois else result.objections end;
  if after_n <> before_n then
    insert into public.task_tally_events (task_id, country_key, country, kind, delta, total_after, recorded_by)
    values (t, k, result.country, kind, delta, after_n, auth.uid());
  end if;
  return result;
end;
$$;
