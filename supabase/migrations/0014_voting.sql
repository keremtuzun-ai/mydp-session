-- Voting on a shared resolution. The desk opens one voting round per
-- published delegation; every non-staff member casts one vote (in favour,
-- against, abstain) and may change it while the round is open; the desk
-- closes the round and can reopen or clear it. Hiding the resolution removes
-- the round and its votes.

create table public.resolution_votings (
  delegation_key text primary key references public.resolution_publications (delegation_key) on delete cascade,
  upload_id uuid not null references public.task_uploads (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_by uuid references public.profiles (id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.resolution_votings enable row level security;
create policy "resolution_votings_select" on public.resolution_votings for select to authenticated using (true);
create policy "resolution_votings_insert" on public.resolution_votings for insert to authenticated with check (public.is_staff());
create policy "resolution_votings_update" on public.resolution_votings for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "resolution_votings_delete" on public.resolution_votings for delete to authenticated using (public.is_staff());

create table public.resolution_votes (
  delegation_key text not null references public.resolution_votings (delegation_key) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  choice text not null check (choice in ('favour', 'against', 'abstain')),
  voter_delegation text,
  voted_at timestamptz not null default now(),
  primary key (delegation_key, profile_id)
);
create index resolution_votes_key_idx on public.resolution_votes (delegation_key, voted_at);
alter table public.resolution_votes enable row level security;
-- A member sees their own vote; the desk sees every vote.
create policy "resolution_votes_select" on public.resolution_votes for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());
-- Only while the round is open, only for yourself, and the desk does not vote.
create policy "resolution_votes_insert" on public.resolution_votes for insert to authenticated
  with check (
    profile_id = auth.uid() and not public.is_staff()
    and exists (select 1 from public.resolution_votings v where v.delegation_key = resolution_votes.delegation_key and v.status = 'open')
  );
create policy "resolution_votes_update" on public.resolution_votes for update to authenticated
  using (profile_id = auth.uid() and exists (select 1 from public.resolution_votings v where v.delegation_key = resolution_votes.delegation_key and v.status = 'open'))
  with check (profile_id = auth.uid() and not public.is_staff());
create policy "resolution_votes_delete" on public.resolution_votes for delete to authenticated using (public.is_staff());

-- Aggregate tally readable by every member (individual votes stay private).
create or replace function public.resolution_vote_counts(k text)
returns table (favour integer, against integer, abstain integer, total integer)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where choice = 'favour')::integer,
    count(*) filter (where choice = 'against')::integer,
    count(*) filter (where choice = 'abstain')::integer,
    count(*)::integer
  from public.resolution_votes
  where delegation_key = k;
$$;
grant execute on function public.resolution_vote_counts(text) to authenticated;
