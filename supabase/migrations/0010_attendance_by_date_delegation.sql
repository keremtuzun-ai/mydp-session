-- Attendance is taken on a date the executive types, not per session;
-- submissions carry the delegate's delegation; online meeting links are gone.

alter table public.task_uploads add column if not exists delegation text check (char_length(delegation) <= 80);
alter table public.weekly_sessions drop column if exists meeting_url;

alter table public.attendance_records add column if not exists attended_on date;
update public.attendance_records a
  set attended_on = (s.starts_at at time zone 'Europe/Istanbul')::date
  from public.weekly_sessions s
  where s.id = a.session_id and a.attended_on is null;
delete from public.attendance_records where attended_on is null;
alter table public.attendance_records alter column attended_on set not null;
alter table public.attendance_records alter column session_id drop not null;
alter table public.attendance_records drop constraint if exists attendance_records_session_id_profile_id_key;
alter table public.attendance_records add constraint attendance_records_attended_on_profile_id_key unique (attended_on, profile_id);
create index if not exists attendance_date_idx on public.attendance_records (attended_on);

drop policy if exists "attendance_insert" on public.attendance_records;
create policy "attendance_insert" on public.attendance_records for insert to authenticated
  with check (recorded_by = auth.uid() and public.is_staff());
drop policy if exists "attendance_update" on public.attendance_records;
create policy "attendance_update" on public.attendance_records for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
