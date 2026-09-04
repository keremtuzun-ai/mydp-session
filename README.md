# MUN Session Hub

An internal platform for running a school's weekly Model United Nations sessions. Delegates see their committee, their tasks and their attendance. Chairs run their committee. The Secretariat (executives and admins) runs the programme.

Built with Next.js 16 (App Router, TypeScript), Tailwind CSS 4 with shadcn-style components, Supabase (Postgres, Auth, Storage, Row Level Security), Zod, React Hook Form and Lucide icons.

## Contents

- [Quick start](#quick-start)
- [Supabase setup](#supabase-setup)
- [Environment variables](#environment-variables)
- [Migrations and seed data](#migrations-and-seed-data)
- [Test accounts](#test-accounts-local-development-only)
- [Roles](#roles)
- [Routes](#routes)
- [Scripts and verification](#scripts-and-verification)
- [Deployment](#deployment)
- [Email templates](#email-templates)
- [Troubleshooting](#troubleshooting)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and the permission model.

## Quick start

```bash
git clone https://github.com/keremtuzun-ai/mydp-session.git mun-session-hub
cd mun-session-hub
npm install
cp .env.example .env.local        # then fill in the values (see below)
```

Option A, local Supabase (needs Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase start                    # prints the local URL, anon key and service-role key
supabase db reset                 # applies supabase/migrations/*
npm run db:seed                   # creates users, committees, sessions, tasks, files
npm run dev                       # http://localhost:3000
```

Local emails (sign-in codes, reset links) land in Inbucket at http://localhost:54324.

Option B, hosted Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push                  # applies migrations
npm run db:seed
npm run dev
```

## Supabase setup

1. Create a project (or run `supabase start`).
2. Copy the project URL, anon key and service-role key into `.env.local`.
3. Authentication → URL configuration: set the Site URL to your app origin and add `<origin>/auth/callback` to the redirect allow-list.
4. Authentication → Email: keep "Confirm email" on. The app uses **email OTP** for first-time verification and code sign-in. Customize the "Magic Link" and "Reset password" templates so they include the six-digit code, `{{ .Token }}` (see [Email templates](#email-templates)). `supabase/config.toml` already does this for the local stack.
5. Apply migrations (`supabase db reset` locally or `supabase db push` for hosted).
6. Seed (`npm run db:seed`). The seed also writes your `ALLOWED_SCHOOL_DOMAINS` into the `allowed_email_domains` table, which the database uses to refuse sign-ups from other domains.

Storage buckets (`task-evidence`, `materials`, `committee-submissions`, `avatars`) and their policies are created by `supabase/migrations/0003_storage.sql`.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Public anon key; every query through it is subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Username → email lookup at sign-in, signed download URLs, audit log, seed, admin user deletion. Never shipped to the browser. |
| `ALLOWED_SCHOOL_DOMAINS` | server | Comma-separated email domains allowed to create accounts, e.g. `school.edu,stu.school.edu`. Subdomains must be listed explicitly. Empty means nobody can register. |
| `NEXT_PUBLIC_SITE_URL` | browser + server | Public origin, used in auth redirect links |
| `NEXT_PUBLIC_APP_NAME` | browser + server | Display name (default "MUN Session Hub") |
| `NEXT_PUBLIC_SCHOOL_NAME` | browser + server | School name shown in the shell |
| `MAX_UPLOAD_BYTES` | server | Evidence upload limit (default 15 MB) |
| `SEED_PASSWORD` | seed only | Password given to seeded accounts |

## Migrations and seed data

```
supabase/
  migrations/0001_schema.sql    tables, enums, helper functions, triggers
  migrations/0002_rls.sql       Row Level Security policies, column grants
  migrations/0003_storage.sql   buckets and storage policies
  templates/*.html              email templates for the local stack
  config.toml                   local CLI config (OTP length, template paths)
scripts/seed.ts                 development data (idempotent)
```

Apply migrations with `supabase db reset` (local, destructive) or `supabase db push` (hosted). Run the seed with `npm run db:seed`; it reads `.env.local`, creates or updates the accounts below, and replaces seeded sessions, tasks, uploads, announcements, materials and attendance.

After changing the schema, regenerate the TypeScript types and compare with `src/lib/types/database.ts`:

```bash
supabase gen types typescript --local > src/lib/types/database.ts
```

## Test accounts (local development only)

Created by the seed under the first domain in `ALLOWED_SCHOOL_DOMAINS` (shown here as `school.edu`). Password for all: the value of `SEED_PASSWORD` (default `MunHub!2026`). Sign in with **username + password** or request a code at the email.

| Role | Username | Email | Committees |
| --- | --- | --- | --- |
| Admin | `mun-admin` | admin@school.edu | — |
| Executive | `leyla-sahin` | leyla.sahin@school.edu | UNSC (executive) |
| Chair | `selin-arslan` | selin.arslan@school.edu | UNSC chair, HCC co-chair |
| Chair | `emre-yildiz` | emre.yildiz@school.edu | WHO chair |
| Delegate | `ayse-demir` | ayse.demir@school.edu | UNSC (France) |
| Delegate | `mehmet-kaya` | mehmet.kaya@school.edu | UNSC (Ghana) |
| Delegate | `zeynep-celik` | zeynep.celik@school.edu | WHO (Brazil) |
| Delegate | `can-aydin` | can.aydin@school.edu | UNSC (Japan), UNHCR |
| Delegate | `elif-koc` | elif.koc@school.edu | WHO (Kenya), ECOSOC |
| Delegate | `burak-dogan` | burak.dogan@school.edu | WHO (Norway), HCC |

Never run the seed against a production project.

## Roles

| Role | Can |
| --- | --- |
| **Admin** | Everything: users and roles, committees, sessions, tasks, materials, announcements, attendance, analytics, allowed domains, audit log. |
| **Executive** | Create and manage sessions, committees, announcements (any audience), materials, tasks for anyone, attendance for anyone, analytics. Cannot change roles, delete users, delete committees or manage domains. |
| **Chair** | Only for committees they chair: tasks, agenda block and chair notes, announcements, materials, attendance, feedback, members (add or remove delegates). Sees private contact details of their own members only. |
| **Delegate** | Own profile, own committees and their content, own tasks (status: not started → in progress → submitted, plus evidence uploads), own attendance and feedback, published sessions, announcements addressed to them. |

Authorization is enforced in the database (RLS + triggers) and again in server actions. The UI only decides what to show.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with "First-time setup" and "Sign in" |
| `/welcome` | First-time: school email → one-time code |
| `/verify` | Enter the six-digit code (setup or code sign-in) |
| `/login` | Username + password, or school-email code; reset link |
| `/reset-password`, `/reset-password/update` | Password reset by verified school email |
| `/onboarding` | Name, grade, phone, unique username, password, photo (only after email verification) |
| `/dashboard` | Next session, committee, upcoming tasks, announcements, attendance, quick links |
| `/sessions`, `/sessions/new`, `/sessions/[id]`, `/sessions/[id]/edit` | Weekly session archive, detail with committee blocks, tasks, resources, feedback |
| `/committees`, `/committees/new`, `/committees/[slug]` | Directory and committee workspace (topic, chairs, members, work, resources, submissions, announcements) |
| `/resolutions` | Document links (Google Docs etc.) delegates share with their committee; chairs review them |
| `/calendar`, `/calendar/new`, `/calendar/[id]`, `/calendar/[id]/edit` | Task list (table on desktop, cards on mobile), task detail with status, evidence uploads, activity log |
| `/materials` | Searchable library with committee / session / category / type filters |
| `/announcements` | Notice board with audience targeting, pinning and read status |
| `/attendance` | Personal history and rate; roll call for chairs and staff |
| `/analytics` | Staff-only metrics and charts |
| `/settings` | Profile, photo, password, sessions; read-only email, username, role |
| `/admin`, `/admin/committees`, `/admin/sessions`, `/admin/templates`, `/admin/domains`, `/admin/audit` | Admin console |
| `/auth/callback` | Email link landing (magic link, recovery) |
| `/auth/signout` (POST) | Sign out |
| `/api/username-available` | Live username check (requires verified session) |
| `/api/files/[kind]/[id]` | RLS-checked redirect to a short-lived signed download URL |
| `/api/health` | Health check |

## Scripts and verification

```bash
npm run dev          # development server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest unit tests
npm run build        # production build
npm run check        # lint + typecheck + test + build
npm run db:seed      # seed (reads .env.local)
```

Unit tests cover the school-domain restriction, username rules, the onboarding gate, the permission model (delegate isolation, chair scope, admin access, upload permissions) and file validation.

Live RLS tests run against a seeded Supabase project when you opt in:

```bash
RUN_RLS_TESTS=1 npx tsx --env-file=.env.local node_modules/vitest/vitest.mjs run tests/rls.integration.test.ts
```

## Deployment

**Live:** https://mun-session-hub.vercel.app (Vercel project `mun-session-hub` in the `keremtuzuns-projects` team, Supabase project `tdrfieisbhhiymopulwj`).

The GitHub repository lives under the `keremtuzun-ai` account, which the Vercel GitHub app is not installed on, so pushes do not auto-deploy yet. Ship from a checkout instead:

```bash
npx vercel deploy --prod --yes          # build + deploy the working tree
scripts/vercel-env.sh production        # re-sync env vars from .env.local (SITE_URL=https://… overrides the site URL)
```

To enable push-to-deploy, install the Vercel GitHub app on the `keremtuzun-ai` account (Vercel dashboard → Settings → Git) and run `npx vercel git connect`.

The project also sets `TZ=Europe/Istanbul` so server-rendered times match the school's clock.

The app is a standard Next.js application. On any Vercel project:

1. Import the repository.
2. Add the environment variables from `.env.example` (set `NEXT_PUBLIC_SITE_URL` to the production URL).
3. In Supabase, add `https://<your-domain>/auth/callback` to the auth redirect allow-list and set the Site URL.
4. Apply migrations to the production project with `supabase db push`. Do **not** run the seed.
5. Create the first admin: register through the app, then in the SQL editor run `update public.profiles set role = 'admin' where school_email = 'you@school.edu';`

Any Node 20.9+ host works the same way (`npm run build && npm start`).

## Email templates

Branded MUNDP templates live in `supabase/templates/` (magic link / code, confirm signup, password reset, email change, invite). They carry the logo, the six-digit `{{ .Token }}` and the `{{ .ConfirmationURL }}` button. The local stack loads them from `config.toml`. On hosted Supabase, paste each one into Authentication → Emails → Templates once custom SMTP is enabled (Authentication → Emails → SMTP Settings): Supabase's built-in mailer is limited to a handful of emails per hour and does not allow template edits.

On hosted Supabase, email templates can only be edited once **custom SMTP** is configured (Authentication → Emails → SMTP Settings). Until then Supabase's default templates are used: they carry a sign-in link and no code. The link lands on `/auth/callback`, which completes setup, sign-in or password reset, so every flow still works; just open the link in the same browser you started from. The built-in email service is also rate-limited to a few messages per hour, which is fine for testing but not for a whole programme.

Once custom SMTP is set up, include `{{ .Token }}` in these templates so the six-digit code flows work too:

- **Magic Link** (used by first-time setup and code sign-in)
- **Reset password** (recovery code)

Reference templates are in `supabase/templates/`. Links keep working too: they land on `/auth/callback`, which exchanges the code and routes the user to onboarding, the reset page, or the dashboard.

## Troubleshooting

- **"Database error saving new user"** when requesting a code: the email's domain is not in the `allowed_email_domains` table. Add it in Admin → School domains (or re-run the seed) and to `ALLOWED_SCHOOL_DOMAINS`.
- **The code email has no code**: the default template is in use (custom SMTP is required to edit templates). Clicking the link still works and completes the same flow.
- **Downloads return 404**: the viewer cannot see the row (RLS), or the object was removed from storage.
- **Chair notes missing**: only chairs of that committee and staff can read them; the column is hidden at database level and served through `session_chair_notes()`.
