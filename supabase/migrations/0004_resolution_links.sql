-- Resolution documents: delegates share the link to their working paper,
-- draft resolution or amendment (Google Docs and the like) with their committee.

create table public.resolution_links (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  url text not null check (url ~* '^https://'),
  kind text not null default 'draft_resolution' check (kind in ('position_paper', 'working_paper', 'draft_resolution', 'amendment', 'other')),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resolution_links_committee_idx on public.resolution_links (committee_id, created_at desc);
create index resolution_links_profile_idx on public.resolution_links (profile_id);
create trigger resolution_links_updated_at before update on public.resolution_links for each row execute function public.set_updated_at();

alter table public.resolution_links enable row level security;

-- Everyone in the committee reads the committee's documents; chairs and staff too.
create policy "resolution_links_select" on public.resolution_links for select to authenticated
  using (profile_id = auth.uid() or public.is_member_of(committee_id) or public.is_chair_of(committee_id) or public.is_staff());
-- Members post their own; chairs and staff may post for their committee.
create policy "resolution_links_insert" on public.resolution_links for insert to authenticated
  with check (profile_id = auth.uid() and (public.is_member_of(committee_id) or public.is_chair_of(committee_id) or public.is_staff()));
create policy "resolution_links_update" on public.resolution_links for update to authenticated
  using (profile_id = auth.uid() or public.is_chair_of(committee_id) or public.is_staff())
  with check (profile_id = auth.uid() or public.is_chair_of(committee_id) or public.is_staff());
create policy "resolution_links_delete" on public.resolution_links for delete to authenticated
  using (profile_id = auth.uid() or public.is_chair_of(committee_id) or public.is_staff());
