-- Executive access is one shared account behind the secret link + password;
-- the per-email allow-list from 0007 is retired. Because the account is
-- shared, tasks and announcements record the name of the executive who
-- published them.

drop policy if exists "exec_allowlist_select" on public.exec_allowlist;
drop policy if exists "exec_allowlist_admin" on public.exec_allowlist;
drop function if exists public.promote_allowlisted_executives();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, school_email) values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop table if exists public.exec_allowlist;

alter table public.tasks add column if not exists author_name text check (char_length(author_name) <= 80);
alter table public.announcements add column if not exists author_name text check (char_length(author_name) <= 80);
