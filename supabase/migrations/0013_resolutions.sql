-- Resolutions. Members sign in with a name and a surname that is kept on
-- their profile; every submission carries a file AND a link plus the
-- delegation; the executive desk chooses which delegations' resolutions
-- the whole club may read inline on /resolutions (hidden by default).

alter table public.profiles
  add column if not exists first_name text check (first_name is null or char_length(first_name) between 1 and 60),
  add column if not exists last_name text check (last_name is null or char_length(last_name) between 1 and 60),
  add column if not exists delegation text check (delegation is null or char_length(delegation) <= 80);

-- The public projection gains the name parts and the last delegation used.
create or replace view public.public_profiles as
  select id, username, display_name, grade, avatar_url, role, first_name, last_name, delegation from public.profiles;

-- New submissions need both a file and a link; older rows are left as they are.
alter table public.task_uploads drop constraint if exists task_uploads_file_and_link;
alter table public.task_uploads add constraint task_uploads_file_and_link
  check (storage_path is not null and external_url is not null) not valid;

-- Any member may put a file under any existing task (the row policy has
-- allowed this since 0011; the storage policy still required the assignee).
drop policy if exists "evidence_insert" on storage.objects;
create policy "evidence_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-evidence'
    and owner = auth.uid()
    and exists (select 1 from public.tasks k where k.id = ((storage.foldername(name))[1])::uuid)
  );

-- One published document per delegation, chosen by the desk.
create table public.resolution_publications (
  delegation_key text primary key,
  delegation text not null check (char_length(delegation) between 1 and 80),
  upload_id uuid not null references public.task_uploads (id) on delete cascade,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz not null default now()
);
create index resolution_publications_upload_idx on public.resolution_publications (upload_id);
alter table public.resolution_publications enable row level security;
create policy "resolution_publications_select" on public.resolution_publications for select to authenticated using (true);
create policy "resolution_publications_insert" on public.resolution_publications for insert to authenticated with check (public.is_staff());
create policy "resolution_publications_update" on public.resolution_publications for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "resolution_publications_delete" on public.resolution_publications for delete to authenticated using (public.is_staff());

-- A published upload becomes readable by every member (its bytes are still
-- served through the app, never as a download link).
drop policy if exists "task_uploads_select" on public.task_uploads;
create policy "task_uploads_select" on public.task_uploads for select to authenticated
  using (
    uploaded_by = auth.uid()
    or public.is_staff()
    or exists (select 1 from public.resolution_publications p where p.upload_id = task_uploads.id)
  );
