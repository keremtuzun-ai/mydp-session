-- MUN Session Hub — core schema
-- Run with `supabase db reset` (local) or `supabase db push` (hosted).

create extension if not exists "pgcrypto";

-- ───────────────────────── enums ─────────────────────────
create type public.user_role as enum ('admin', 'executive', 'chair', 'delegate');
create type public.membership_role as enum ('delegate', 'chair', 'co_chair', 'executive');
create type public.session_status as enum ('draft', 'published', 'completed', 'cancelled');
create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.task_status as enum ('not_started', 'in_progress', 'submitted', 'reviewed', 'completed', 'overdue');
create type public.attendance_status as enum ('present', 'late', 'excused', 'absent');
create type public.material_category as enum ('study_guide', 'rules_of_procedure', 'topic_brief', 'research_source', 'template', 'slide_deck', 'recording');
create type public.material_visibility as enum ('everyone', 'committee', 'staff');

-- ───────────────────────── allowed domains ─────────────────────────
-- Defence in depth for ALLOWED_SCHOOL_DOMAINS: the app checks the env var,
-- and the database refuses auth.users rows outside this table.
create table public.allowed_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_at timestamptz not null default now()
);

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  school_email text not null unique,
  username text unique check (username is null or (username ~ '^[a-z0-9-]{3,24}$' and username !~ '^-' and username !~ '-$')),
  display_name text check (display_name is null or char_length(display_name) between 2 and 80),
  grade text check (grade is null or grade in ('9', '10', '11', '12')),
  phone text,
  avatar_url text,
  role public.user_role not null default 'delegate',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);

-- Non-private projection of profiles. The view runs with the owner's rights
-- (no security_invoker) so every signed-in member can resolve names and
-- avatars WITHOUT gaining access to school_email or phone.
create view public.public_profiles as
  select id, username, display_name, grade, avatar_url, role from public.profiles;

-- ───────────────────────── committees ─────────────────────────
create table public.committees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  acronym text not null,
  name text not null,
  category text not null,
  description text,
  current_topic text,
  background_guide_url text,
  is_open boolean not null default true,
  submissions_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.committee_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  committee_id uuid not null references public.committees (id) on delete cascade,
  membership_role public.membership_role not null default 'delegate',
  delegation text,
  created_at timestamptz not null default now(),
  unique (profile_id, committee_id)
);
create index committee_memberships_committee_idx on public.committee_memberships (committee_id);
create index committee_memberships_profile_idx on public.committee_memberships (profile_id);

-- ───────────────────────── weekly sessions ─────────────────────────
create table public.weekly_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  theme text,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  location text,
  meeting_url text,
  dress_code text,
  general_agenda text,
  status public.session_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weekly_sessions_starts_idx on public.weekly_sessions (starts_at);
create index weekly_sessions_status_idx on public.weekly_sessions (status);

create table public.session_committees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.weekly_sessions (id) on delete cascade,
  committee_id uuid not null references public.committees (id) on delete cascade,
  topic text,
  agenda text,
  chair_notes text,
  created_at timestamptz not null default now(),
  unique (session_id, committee_id)
);
create index session_committees_committee_idx on public.session_committees (committee_id);

-- ───────────────────────── tasks ─────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to_profile_id uuid references public.profiles (id) on delete set null,
  assigned_role public.user_role,
  assigned_committee_id uuid references public.committees (id) on delete set null,
  session_id uuid references public.weekly_sessions (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  due_at timestamptz,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'not_started',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A task must be aimed at someone: a person, a role, or a committee.
  check (assigned_to_profile_id is not null or assigned_role is not null or assigned_committee_id is not null)
);
create index tasks_assignee_idx on public.tasks (assigned_to_profile_id);
create index tasks_committee_idx on public.tasks (assigned_committee_id);
create index tasks_session_idx on public.tasks (session_id);
create index tasks_status_idx on public.tasks (status);
create index tasks_due_idx on public.tasks (due_at);

create table public.task_uploads (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 26214400),
  created_at timestamptz not null default now()
);
create index task_uploads_task_idx on public.task_uploads (task_id);

create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority public.task_priority not null default 'normal',
  default_due_days integer not null default 7 check (default_due_days between 0 and 365),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── materials ─────────────────────────
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category public.material_category not null,
  committee_id uuid references public.committees (id) on delete set null,
  session_id uuid references public.weekly_sessions (id) on delete set null,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text unique,
  external_url text,
  file_name text,
  mime_type text,
  size_bytes integer,
  visibility public.material_visibility not null default 'everyone',
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null),
  check (visibility <> 'committee' or committee_id is not null)
);
create index materials_committee_idx on public.materials (committee_id);
create index materials_session_idx on public.materials (session_id);
create index materials_category_idx on public.materials (category);

-- ───────────────────────── announcements ─────────────────────────
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid references public.profiles (id) on delete set null,
  pinned boolean not null default false,
  target_role public.user_role,
  target_committee_id uuid references public.committees (id) on delete cascade,
  target_session_id uuid references public.weekly_sessions (id) on delete cascade,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index announcements_published_idx on public.announcements (pinned desc, published_at desc);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, profile_id)
);

-- ───────────────────────── attendance ─────────────────────────
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.weekly_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (session_id, profile_id)
);
create index attendance_profile_idx on public.attendance_records (profile_id);

-- ───────────────────────── committee submissions ─────────────────────────
create table public.committee_submissions (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  notes text,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);
create index committee_submissions_committee_idx on public.committee_submissions (committee_id);

-- ───────────────────────── audit logs ─────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ───────────────────────── helper functions ─────────────────────────
-- SECURITY DEFINER helpers read profiles/memberships without recursing into
-- their own RLS policies. search_path is pinned to stop hijacking.

create or replace function public.current_profile_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin', 'executive'), false);
$$;

create or replace function public.is_chair_of(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.committee_memberships
    where profile_id = auth.uid() and committee_id = c and membership_role in ('chair', 'co_chair')
  );
$$;

create or replace function public.is_member_of(c uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.committee_memberships where profile_id = auth.uid() and committee_id = c
  );
$$;

create or replace function public.shares_committee_with(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.committee_memberships a
    join public.committee_memberships b on a.committee_id = b.committee_id
    where a.profile_id = auth.uid() and b.profile_id = p
  );
$$;

create or replace function public.chairs_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.committee_memberships a
    join public.committee_memberships b on a.committee_id = b.committee_id
    where a.profile_id = auth.uid() and a.membership_role in ('chair', 'co_chair') and b.profile_id = p
  );
$$;

create or replace function public.can_view_session(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.weekly_sessions where id = s and status <> 'draft'
  );
$$;

create or replace function public.can_view_task(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tasks k
    where k.id = t and (
      public.is_staff()
      or k.assigned_to_profile_id = auth.uid()
      or k.created_by = auth.uid()
      or (k.assigned_committee_id is not null and public.is_chair_of(k.assigned_committee_id))
      or (
        k.assigned_to_profile_id is null and k.assigned_role is not null
        and k.assigned_role = public.current_profile_role()
        and (k.assigned_committee_id is null or public.is_member_of(k.assigned_committee_id))
      )
      or (
        k.assigned_to_profile_id is null and k.assigned_role is null
        and k.assigned_committee_id is not null and public.is_member_of(k.assigned_committee_id)
      )
    )
  );
$$;

create or replace function public.can_manage_task(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.tasks k
    where k.id = t and k.assigned_committee_id is not null and public.is_chair_of(k.assigned_committee_id)
  );
$$;

create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(p_username));
$$;

-- Chair notes are hidden from delegates by column privilege (see 0002) and
-- exposed to chairs / staff through this function.
create or replace function public.session_chair_notes(sc uuid)
returns text language sql stable security definer set search_path = public as $$
  select chair_notes from public.session_committees x
  where x.id = sc and (public.is_staff() or public.is_chair_of(x.committee_id));
$$;

-- Flag open tasks whose due date has passed. Safe to call repeatedly.
create or replace function public.mark_overdue_tasks()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.tasks
     set status = 'overdue', updated_at = now()
   where due_at is not null and due_at < now()
     and status in ('not_started', 'in_progress');
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ───────────────────────── triggers ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.weekly_sessions for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- DB-level domain gate: refuse auth.users rows outside the allow-list before
-- they are written. Runs even when the auth API is called directly.
create or replace function public.enforce_allowed_email_domain()
returns trigger language plpgsql security definer set search_path = public as $$
declare d text;
begin
  d := lower(split_part(coalesce(new.email, ''), '@', 2));
  if exists (select 1 from public.allowed_email_domains)
     and not exists (select 1 from public.allowed_email_domains where domain = d) then
    raise exception 'Email domain % is not an approved school domain', d using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger on_auth_user_domain_check before insert on auth.users for each row execute function public.enforce_allowed_email_domain();

-- New auth user → profile row (after insert, so the FK to auth.users holds).
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, school_email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

-- Users may only edit safe columns of their own profile.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No JWT user (service role, SQL editor, migrations) or an admin: no restrictions.
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.id <> old.id or new.role <> old.role or new.school_email <> old.school_email then
    raise exception 'You cannot change your role or school email' using errcode = '42501';
  end if;
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Username cannot be changed once chosen' using errcode = '42501';
  end if;
  if old.onboarding_completed_at is not null and new.onboarding_completed_at is distinct from old.onboarding_completed_at then
    raise exception 'Onboarding state is locked' using errcode = '42501';
  end if;
  if new.onboarding_completed_at is not null and (new.username is null or new.display_name is null or new.grade is null) then
    raise exception 'Onboarding requires a username, full name and grade' using errcode = '23514';
  end if;
  new.username := lower(new.username);
  return new;
end;
$$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_columns();

-- Delegates may only move their own task between not_started / in_progress /
-- submitted. Everything else is reserved for chairs and staff.
create or replace function public.enforce_task_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if public.is_staff() or (old.assigned_committee_id is not null and public.is_chair_of(old.assigned_committee_id)) then
    return new;
  end if;
  if old.assigned_to_profile_id is distinct from auth.uid() then
    raise exception 'Only the assignee may update this task' using errcode = '42501';
  end if;
  if row(new.title, new.description, new.assigned_to_profile_id, new.assigned_role, new.assigned_committee_id,
         new.session_id, new.created_by, new.due_at, new.priority, new.reviewed_by, new.reviewed_at, new.review_note)
     is distinct from
     row(old.title, old.description, old.assigned_to_profile_id, old.assigned_role, old.assigned_committee_id,
         old.session_id, old.created_by, old.due_at, old.priority, old.reviewed_by, old.reviewed_at, old.review_note) then
    raise exception 'Delegates may only change the task status' using errcode = '42501';
  end if;
  if old.status in ('reviewed', 'completed') then
    raise exception 'This task has been closed by a chair' using errcode = '42501';
  end if;
  if new.status not in ('not_started', 'in_progress', 'submitted') then
    raise exception 'Delegates may only mark a task as not started, in progress or submitted' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger tasks_enforce_update before update on public.tasks for each row execute function public.enforce_task_update();

-- Every status transition is written to the activity log automatically.
create or replace function public.log_task_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (task_id, actor_id, action, metadata)
    values (new.id, coalesce(auth.uid(), new.created_by), 'created', jsonb_build_object('status', new.status, 'priority', new.priority));
  elsif new.status is distinct from old.status then
    insert into public.task_activity (task_id, actor_id, action, metadata)
    values (new.id, auth.uid(), 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;
create trigger tasks_log_status after insert or update on public.tasks for each row execute function public.log_task_status_change();

create or replace function public.log_task_upload()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_activity (task_id, actor_id, action, metadata)
  values (new.task_id, new.uploaded_by, 'evidence_uploaded', jsonb_build_object('upload_id', new.id, 'title', new.title, 'file_name', new.file_name));
  return new;
end;
$$;
create trigger task_uploads_log after insert on public.task_uploads for each row execute function public.log_task_upload();

-- Chairs may only post committee-scoped announcements for their own committee.
create or replace function public.enforce_announcement_scope()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.is_staff() then return new; end if;
  if new.target_committee_id is null or not public.is_chair_of(new.target_committee_id) then
    raise exception 'Chairs may only announce to a committee they chair' using errcode = '42501';
  end if;
  if new.target_role is not null then
    raise exception 'Chairs cannot target roles' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger announcements_scope before insert or update on public.announcements for each row execute function public.enforce_announcement_scope();

-- ───────────────────────── post-session feedback ─────────────────────────
-- Written by a chair or executive for one delegate about one session.
create table public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.weekly_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index session_feedback_profile_idx on public.session_feedback (profile_id, session_id);
