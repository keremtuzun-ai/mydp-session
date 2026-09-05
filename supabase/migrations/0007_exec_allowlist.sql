-- Executive allow-list. Emails on this list become executives: new accounts
-- start with role 'executive', existing delegate/chair accounts are promoted.
-- Rows are written by the server (service role) from the secret invite link
-- and by admins; executives can read the list.

create table public.exec_allowlist (
  email text primary key check (email = lower(email)),
  note text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exec_allowlist enable row level security;
create policy "exec_allowlist_select" on public.exec_allowlist for select to authenticated using (public.is_staff());
create policy "exec_allowlist_admin" on public.exec_allowlist for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- New auth user → profile row; executives when the email is on the allow-list.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, school_email, role)
  values (
    new.id,
    lower(new.email),
    case when exists (select 1 from public.exec_allowlist where email = lower(new.email)) then 'executive'::public.user_role else 'delegate'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Promote anyone already registered who is on the list (admins keep admin).
create or replace function public.promote_allowlisted_executives()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.profiles p set role = 'executive'
  where p.role in ('delegate', 'chair')
    and exists (select 1 from public.exec_allowlist a where a.email = lower(p.school_email));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.promote_allowlisted_executives() from public;

insert into public.exec_allowlist (email, note) values ('cand2028_1@stu.koc.k12.tr', 'Executive, added in migration 0007')
on conflict (email) do nothing;
select public.promote_allowlisted_executives();
