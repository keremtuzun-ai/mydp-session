-- MUN Session Hub — Storage buckets and policies
-- Paths:
--   task-evidence/<task_id>/<uuid>-<file>          private
--   materials/<material_id>/<file>                  private
--   committee-submissions/<committee_id>/<profile_id>/<uuid>-<file>   private
--   avatars/<profile_id>/avatar.<ext>               public read

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('task-evidence', 'task-evidence', false, 26214400,
    array['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('materials', 'materials', false, 52428800, null),
  ('committee-submissions', 'committee-submissions', false, 26214400,
    array['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- task evidence: folder = task id
create policy "evidence_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'task-evidence'
    and (owner = auth.uid() or public.can_manage_task(((storage.foldername(name))[1])::uuid))
  );
create policy "evidence_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-evidence'
    and owner = auth.uid()
    and (
      public.can_manage_task(((storage.foldername(name))[1])::uuid)
      or exists (
        select 1 from public.tasks k
        where k.id = ((storage.foldername(name))[1])::uuid
          and k.assigned_to_profile_id = auth.uid()
          and k.status not in ('reviewed', 'completed')
      )
    )
  );
create policy "evidence_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'task-evidence' and (owner = auth.uid() or public.can_manage_task(((storage.foldername(name))[1])::uuid)));

-- materials: read is decided by the materials row (signed URLs are only
-- minted after an RLS-checked read), upload by staff or chairs
create policy "materials_read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (owner = auth.uid() or public.is_staff()));
create policy "materials_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and owner = auth.uid() and (public.is_staff() or public.current_profile_role() = 'chair'));
create policy "materials_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (owner = auth.uid() or public.is_staff()));

-- committee submissions: folder[1] = committee id, folder[2] = profile id
create policy "submissions_read" on storage.objects for select to authenticated
  using (bucket_id = 'committee-submissions' and (owner = auth.uid() or public.is_staff() or public.is_chair_of(((storage.foldername(name))[1])::uuid)));
create policy "submissions_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'committee-submissions'
    and owner = auth.uid()
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_member_of(((storage.foldername(name))[1])::uuid)
  );
create policy "submissions_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'committee-submissions' and (owner = auth.uid() or public.is_staff()));

-- avatars: anyone can view, only the owner writes inside their folder
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_owner_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
