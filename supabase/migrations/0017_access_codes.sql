-- Members sign in with a 12-character access code instead of an email and a
-- password. The executive desk creates every account (name, surname, junior
-- or senior); the code is generated once and can never be changed. Existing
-- members are given a code here so nobody is locked out.

alter table public.profiles
  add column if not exists tier text check (tier is null or tier in ('junior', 'senior'));

create or replace view public.public_profiles as
  select id, username, display_name, grade, avatar_url, role, first_name, last_name, delegation, tier from public.profiles;

create table public.access_codes (
  code text primary key check (code ~ '^[A-Z0-9]{12}$'),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.access_codes enable row level security;
-- A member sees their own code; the desk sees every code. Nobody writes
-- through the API: codes are issued by the server with the service role.
create policy "access_codes_select" on public.access_codes for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());

-- Issued once, never edited (the service role included).
create or replace function public.access_codes_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Access codes cannot be changed once issued' using errcode = '42501';
end;
$$;
create trigger access_codes_immutable before update on public.access_codes for each row execute function public.access_codes_immutable();

-- Backfill: 12 characters from A-Z (without I and O) and 0-9, at least one
-- letter and one digit, drawn with rejection sampling so every symbol is
-- equally likely. The app generates new codes the same way in TypeScript
-- (src/lib/auth/access-code.ts); this function only serves the backfill.
create or replace function public.generate_access_code_backfill()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  n constant int := length(alphabet);
  candidate text;
  b int;
begin
  loop
    candidate := '';
    while length(candidate) < 12 loop
      b := get_byte(gen_random_bytes(1), 0);
      if b < (256 / n) * n then
        candidate := candidate || substr(alphabet, 1 + (b % n), 1);
      end if;
    end loop;
    if candidate ~ '[A-Z]' and candidate ~ '[0-9]' and not exists (select 1 from public.access_codes where code = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

insert into public.access_codes (code, profile_id)
select public.generate_access_code_backfill(), p.id
from public.profiles p
where not exists (select 1 from public.access_codes c where c.profile_id = p.id);

drop function public.generate_access_code_backfill();
