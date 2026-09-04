-- Executive model: tasks carry a free-text committee / clause label, and an
-- upload may be a document link (Google Docs etc.) instead of a file.

alter table public.tasks add column committee_label text check (committee_label is null or char_length(committee_label) <= 120);

alter table public.task_uploads
  alter column storage_path drop not null,
  alter column file_name drop not null,
  alter column mime_type drop not null,
  alter column size_bytes drop not null,
  add column external_url text check (external_url is null or external_url ~* '^https://'),
  add constraint task_uploads_file_or_link check (storage_path is not null or external_url is not null);

-- Attendance: executives and admins record anyone (already true via is_staff()).
-- Rooms: morning sessions meet in 1S, afternoon sessions in the Library.
