-- Every signed-in member sees every task and every announcement (the
-- Secretariat publishes for the whole club), and the Administration section
-- is open to executives as well as admins. Only admins can grant or revoke
-- the admin role or touch an admin's account.

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select to authenticated using (true);

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements for select to authenticated using (true);

drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs for select to authenticated using (public.is_staff());

drop policy if exists "domains_admin" on public.allowed_email_domains;
create policy "domains_admin" on public.allowed_email_domains for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles for delete to authenticated
  using (public.is_staff() and (public.is_admin() or role <> 'admin'));

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.is_admin() then
    return new;
  end if;
  if public.is_staff() and new.id <> auth.uid() then
    -- Executives manage members, but the admin role is reserved for admins.
    if new.id <> old.id or new.school_email <> old.school_email then
      raise exception 'You cannot change a member''s school email' using errcode = '42501';
    end if;
    if (old.role = 'admin' or new.role = 'admin') and new.role is distinct from old.role then
      raise exception 'Only an admin can grant or remove the admin role' using errcode = '42501';
    end if;
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
