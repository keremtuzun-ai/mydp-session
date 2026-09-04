-- MUN Session Hub — Row Level Security
-- UI hiding is never authorization: every table below denies by default.

alter table public.allowed_email_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.committees enable row level security;
alter table public.committee_memberships enable row level security;
alter table public.weekly_sessions enable row level security;
alter table public.session_committees enable row level security;
alter table public.tasks enable row level security;
alter table public.task_uploads enable row level security;
alter table public.task_activity enable row level security;
alter table public.task_templates enable row level security;
alter table public.materials enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.attendance_records enable row level security;
alter table public.committee_submissions enable row level security;
alter table public.audit_logs enable row level security;

-- public_profiles is a plain (owner-rights) view: grant read to members only.
revoke all on public.public_profiles from anon, public;
grant select on public.public_profiles to authenticated;

-- ── allowed_email_domains: admins manage, everybody signed in may read ──
create policy "domains_select" on public.allowed_email_domains for select to authenticated using (true);
create policy "domains_admin" on public.allowed_email_domains for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── profiles ──
-- Private columns (school_email, phone) are visible only to: the owner,
-- staff, and chairs of a committee the person belongs to.
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff() or public.chairs_member(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.is_admin());

-- ── committees ──
create policy "committees_select" on public.committees for select to authenticated using (true);
create policy "committees_staff_write" on public.committees for insert to authenticated with check (public.is_staff());
create policy "committees_update" on public.committees for update to authenticated
  using (public.is_staff() or public.is_chair_of(id)) with check (public.is_staff() or public.is_chair_of(id));
create policy "committees_delete" on public.committees for delete to authenticated using (public.is_admin());

-- ── committee_memberships ──
create policy "memberships_select" on public.committee_memberships for select to authenticated
  using (profile_id = auth.uid() or public.is_staff() or public.is_member_of(committee_id));
create policy "memberships_insert" on public.committee_memberships for insert to authenticated
  with check (public.is_staff() or public.is_chair_of(committee_id));
create policy "memberships_update" on public.committee_memberships for update to authenticated
  using (public.is_staff() or public.is_chair_of(committee_id))
  with check (public.is_staff() or public.is_chair_of(committee_id));
create policy "memberships_delete" on public.committee_memberships for delete to authenticated
  using (public.is_staff() or public.is_chair_of(committee_id));

-- ── weekly_sessions ──
create policy "sessions_select" on public.weekly_sessions for select to authenticated
  using (status <> 'draft' or public.is_staff());
create policy "sessions_insert" on public.weekly_sessions for insert to authenticated with check (public.is_staff());
create policy "sessions_update" on public.weekly_sessions for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "sessions_delete" on public.weekly_sessions for delete to authenticated using (public.is_staff());

-- ── session_committees ──
-- chair_notes are hidden from the authenticated role at column level and
-- served through session_chair_notes() to chairs and staff. Application code
-- must always list columns explicitly on this table (never select *).
revoke select on public.session_committees from authenticated;
grant select (id, session_id, committee_id, topic, agenda, created_at) on public.session_committees to authenticated;
grant insert, update, delete on public.session_committees to authenticated;

create policy "session_committees_select" on public.session_committees for select to authenticated
  using (public.can_view_session(session_id));
create policy "session_committees_insert" on public.session_committees for insert to authenticated
  with check (public.is_staff());
create policy "session_committees_update" on public.session_committees for update to authenticated
  using (public.is_staff() or public.is_chair_of(committee_id))
  with check (public.is_staff() or public.is_chair_of(committee_id));
create policy "session_committees_delete" on public.session_committees for delete to authenticated
  using (public.is_staff());

-- ── tasks ──
create policy "tasks_select" on public.tasks for select to authenticated using (public.can_view_task(id));
create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_staff() or (assigned_committee_id is not null and public.is_chair_of(assigned_committee_id)))
  );
create policy "tasks_update" on public.tasks for update to authenticated
  using (public.can_manage_task(id) or assigned_to_profile_id = auth.uid())
  with check (public.can_manage_task(id) or assigned_to_profile_id = auth.uid());
create policy "tasks_delete" on public.tasks for delete to authenticated using (public.can_manage_task(id));

-- ── task_uploads ──
create policy "task_uploads_select" on public.task_uploads for select to authenticated
  using (uploaded_by = auth.uid() or public.can_manage_task(task_id));
create policy "task_uploads_insert" on public.task_uploads for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.can_manage_task(task_id)
      or exists (
        select 1 from public.tasks k
        where k.id = task_id and k.assigned_to_profile_id = auth.uid() and k.status not in ('reviewed', 'completed')
      )
    )
  );
create policy "task_uploads_delete" on public.task_uploads for delete to authenticated
  using (uploaded_by = auth.uid() or public.can_manage_task(task_id));

-- ── task_activity ──
create policy "task_activity_select" on public.task_activity for select to authenticated using (public.can_view_task(task_id));
create policy "task_activity_insert" on public.task_activity for insert to authenticated
  with check (actor_id = auth.uid() and public.can_view_task(task_id));

-- ── task_templates ──
create policy "task_templates_select" on public.task_templates for select to authenticated
  using (public.is_staff() or public.current_profile_role() = 'chair');
create policy "task_templates_write" on public.task_templates for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ── materials ──
create policy "materials_select" on public.materials for select to authenticated
  using (
    uploaded_by = auth.uid()
    or public.is_staff()
    or (visibility = 'everyone' and (session_id is null or public.can_view_session(session_id)))
    or (visibility = 'committee' and public.is_member_of(committee_id))
    or (visibility = 'staff' and public.current_profile_role() = 'chair' and committee_id is not null and public.is_chair_of(committee_id))
  );
create policy "materials_insert" on public.materials for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (public.is_staff() or (committee_id is not null and public.is_chair_of(committee_id)))
  );
create policy "materials_update" on public.materials for update to authenticated
  using (uploaded_by = auth.uid() or public.is_staff() or (committee_id is not null and public.is_chair_of(committee_id)))
  with check (public.is_staff() or (committee_id is not null and public.is_chair_of(committee_id)));
create policy "materials_delete" on public.materials for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_staff() or (committee_id is not null and public.is_chair_of(committee_id)));

-- ── announcements ──
create policy "announcements_select" on public.announcements for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_staff()
    or (
      published_at <= now()
      and (target_role is null or target_role = public.current_profile_role())
      and (target_committee_id is null or public.is_member_of(target_committee_id))
      and (target_session_id is null or public.can_view_session(target_session_id))
    )
  );
create policy "announcements_insert" on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and (public.is_staff() or (target_committee_id is not null and public.is_chair_of(target_committee_id))));
create policy "announcements_update" on public.announcements for update to authenticated
  using (author_id = auth.uid() or public.is_staff()) with check (author_id = auth.uid() or public.is_staff());
create policy "announcements_delete" on public.announcements for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

create policy "announcement_reads_own" on public.announcement_reads for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ── attendance_records ──
create policy "attendance_select" on public.attendance_records for select to authenticated
  using (profile_id = auth.uid() or public.is_staff() or public.chairs_member(profile_id));
create policy "attendance_insert" on public.attendance_records for insert to authenticated
  with check (recorded_by = auth.uid() and (public.is_staff() or public.chairs_member(profile_id)));
create policy "attendance_update" on public.attendance_records for update to authenticated
  using (public.is_staff() or public.chairs_member(profile_id))
  with check (public.is_staff() or public.chairs_member(profile_id));
create policy "attendance_delete" on public.attendance_records for delete to authenticated using (public.is_staff());

-- ── committee_submissions ──
create policy "submissions_select" on public.committee_submissions for select to authenticated
  using (profile_id = auth.uid() or public.is_staff() or public.is_chair_of(committee_id));
create policy "submissions_insert" on public.committee_submissions for insert to authenticated
  with check (
    profile_id = auth.uid() and public.is_member_of(committee_id)
    and exists (select 1 from public.committees c where c.id = committee_id and c.submissions_enabled)
  );
create policy "submissions_delete" on public.committee_submissions for delete to authenticated
  using (profile_id = auth.uid() or public.is_staff() or public.is_chair_of(committee_id));

-- ── audit_logs ──
create policy "audit_select" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "audit_insert" on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid() and public.is_staff());

-- Functions callable by members
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.session_chair_notes(uuid) to authenticated;
grant execute on function public.mark_overdue_tasks() to authenticated;

-- ── session_feedback ──
alter table public.session_feedback enable row level security;
create policy "feedback_select" on public.session_feedback for select to authenticated
  using (profile_id = auth.uid() or author_id = auth.uid() or public.is_staff() or public.chairs_member(profile_id));
create policy "feedback_insert" on public.session_feedback for insert to authenticated
  with check (author_id = auth.uid() and (public.is_staff() or public.chairs_member(profile_id)));
create policy "feedback_delete" on public.session_feedback for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());
