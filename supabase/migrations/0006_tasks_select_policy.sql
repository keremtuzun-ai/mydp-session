-- The tasks SELECT policy used can_view_task(id), which looks the row up in
-- tasks again. During INSERT … RETURNING the new row is not yet visible to
-- that lookup, so every insert with a RETURNING clause failed with a
-- row-level-security error, even for executives. Evaluate the rule on the
-- row's own columns instead.
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select to authenticated
  using (
    public.is_staff()
    or assigned_to_profile_id = auth.uid()
    or created_by = auth.uid()
    or (assigned_committee_id is not null and public.is_chair_of(assigned_committee_id))
    or (
      assigned_to_profile_id is null and assigned_role is not null
      and assigned_role = public.current_profile_role()
      and (assigned_committee_id is null or public.is_member_of(assigned_committee_id))
    )
    or (
      assigned_to_profile_id is null and assigned_role is null
      and assigned_committee_id is not null and public.is_member_of(assigned_committee_id)
    )
  );
