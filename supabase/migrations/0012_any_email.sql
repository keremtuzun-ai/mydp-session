-- Any email address may register: the school-domain gate is removed.
drop trigger if exists on_auth_user_domain_check on auth.users;
drop function if exists public.enforce_allowed_email_domain();
