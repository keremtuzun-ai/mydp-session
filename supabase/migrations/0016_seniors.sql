-- Every submission names the senior(s) behind it: the app requires at least
-- one and the database caps it at two. Existing rows keep an empty list.
alter table public.task_uploads add column if not exists seniors text[] not null default '{}';
alter table public.task_uploads drop constraint if exists task_uploads_seniors_max;
alter table public.task_uploads add constraint task_uploads_seniors_max check (cardinality(seniors) <= 2);
