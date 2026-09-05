-- Every member can submit to any task and mark it done for themselves.
-- Completion is per member (task_completions); a task assigned to one person
-- also flips its status. Uploads are visible to the uploader and the desk.

create table public.task_completions (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);
alter table public.task_completions enable row level security;
create policy "completions_select" on public.task_completions for select to authenticated using (true);
create policy "completions_insert" on public.task_completions for insert to authenticated with check (profile_id = auth.uid() or public.is_staff());
create policy "completions_delete" on public.task_completions for delete to authenticated using (profile_id = auth.uid() or public.is_staff());

drop policy if exists "task_uploads_insert" on public.task_uploads;
create policy "task_uploads_insert" on public.task_uploads for insert to authenticated with check (uploaded_by = auth.uid());
drop policy if exists "task_uploads_select" on public.task_uploads;
create policy "task_uploads_select" on public.task_uploads for select to authenticated using (uploaded_by = auth.uid() or public.is_staff());

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
  if old.status = 'reviewed' then
    raise exception 'This task was returned by the desk' using errcode = '42501';
  end if;
  if new.status not in ('not_started', 'in_progress', 'submitted', 'completed') then
    raise exception 'Invalid status' using errcode = '42501';
  end if;
  return new;
end;
$$;
