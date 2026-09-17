-- Speech tally. The desk types the countries taking part when it creates a
-- task; the executive desk's Tally page lists the newest task's countries
-- (plus any delegation that submitted to it) and counts each country's
-- speeches, points of information and objections. A new task starts a new
-- list; earlier tallies stay stored against their own task.

alter table public.tasks
  add column if not exists countries text[] not null default '{}';

create table public.task_tallies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  country_key text not null check (country_key <> ''),
  country text not null,
  speeches integer not null default 0 check (speeches >= 0),
  pois integer not null default 0 check (pois >= 0),
  objections integer not null default 0 check (objections >= 0),
  updated_at timestamptz not null default now(),
  primary key (task_id, country_key)
);
alter table public.task_tallies enable row level security;
create policy "task_tallies_select" on public.task_tallies for select to authenticated using (public.is_staff());
create policy "task_tallies_insert" on public.task_tallies for insert to authenticated with check (public.is_staff());
create policy "task_tallies_update" on public.task_tallies for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "task_tallies_delete" on public.task_tallies for delete to authenticated using (public.is_staff());

-- One atomic step (+1 or -1) so two executives counting at once never lose a tap.
create or replace function public.bump_tally(t uuid, k text, label text, kind text, delta integer)
returns public.task_tallies
language plpgsql security invoker set search_path = public as $$
declare
  s integer := case when kind = 'speeches' then delta else 0 end;
  p integer := case when kind = 'pois' then delta else 0 end;
  o integer := case when kind = 'objections' then delta else 0 end;
  result public.task_tallies;
begin
  if not public.is_staff() then
    raise exception 'Only the executive desk can tally' using errcode = '42501';
  end if;
  if kind not in ('speeches', 'pois', 'objections') or delta not in (-1, 1) then
    raise exception 'Invalid tally step' using errcode = '22023';
  end if;
  insert into public.task_tallies as x (task_id, country_key, country, speeches, pois, objections)
  values (t, k, label, greatest(s, 0), greatest(p, 0), greatest(o, 0))
  on conflict (task_id, country_key) do update set
    speeches = greatest(x.speeches + s, 0),
    pois = greatest(x.pois + p, 0),
    objections = greatest(x.objections + o, 0),
    updated_at = now()
  returning * into result;
  return result;
end;
$$;
grant execute on function public.bump_tally(uuid, text, text, text, integer) to authenticated;
