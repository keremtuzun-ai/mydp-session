# Architecture

## Shape

```
Browser ──► Next.js 16 (App Router)
              ├── Server Components: read through the user's Supabase client (RLS applies)
              ├── Server Actions: validate (Zod) → policy check → write through the user's client
              ├── Route handlers: /auth/callback, /auth/signout, /api/username-available, /api/files/*
              └── proxy.ts: refresh session cookie, apply auth/onboarding gate
                        │
                        ▼
              Supabase: Postgres (RLS, triggers, SECURITY DEFINER helpers), Auth (email OTP + password), Storage
```

Everything the app reads or writes on behalf of a user goes through `@supabase/ssr` clients bound to the request cookies, so Postgres sees `auth.uid()` and applies Row Level Security. The service-role client (`src/lib/supabase/admin.ts`, `server-only`) is used in exactly four places: resolving a username to its email during password sign-in, minting signed download URLs after an RLS-checked read, writing audit entries, and admin user deletion.

## Directory map

```
src/
  proxy.ts                    session refresh + gate (Next 16 proxy convention)
  app/
    (auth)/                   welcome, verify, login, reset-password
    onboarding/               profile completion (server-enforced)
    (app)/                    authenticated shell: dashboard, sessions, committees, calendar,
                              materials, announcements, attendance, analytics, settings, admin
    auth/, api/               route handlers
  actions/                    server actions per domain (auth, onboarding, settings, tasks,
                              sessions, committees, announcements, attendance, materials, feedback, admin)
  lib/
    auth/                     domains.ts (allow-list), username.ts, gate.ts (pure routing rules),
                              session.ts (getViewer, server-only), roles.ts, actor.ts
    policy.ts                 pure authorization rules mirroring the SQL policies
    supabase/                 client.ts (browser), server.ts (user, RLS), admin.ts (service role), proxy.ts
    validation/               Zod schemas; file validation
    data/queries.ts           shared read helpers (name resolution via public_profiles, coverage, counts)
    types/database.ts         Database type (hand-maintained mirror of the migrations)
    audit.ts, db-errors.ts, env.ts, utils.ts, action-result.ts
  components/
    ui/                       shadcn-style primitives (radix-ui)
    mun/                      domain components: role/status/priority badges, committee + session cards,
                              upload list, empty state, permission denied, page header, Protected wrapper
    shell/                    app shell, navigation, theme, user menu
    forms/                    SubmitButton, ActionButton, RHF ↔ server action bridge
supabase/migrations           0001 schema, 0002 RLS, 0003 storage
scripts/seed.ts               development data
tests/                        unit tests + opt-in live RLS tests
```

## Authentication flow

1. **Create account** (`/welcome`): school email + password. The server rejects domains outside `ALLOWED_SCHOOL_DOMAINS`, refuses duplicates, and creates the user with the service-role admin API already confirmed, so no verification email is needed. A `before insert` trigger on `auth.users` refuses domains missing from `allowed_email_domains`, so the rule also holds for direct API calls.
2. **Onboarding** (`/onboarding`): reachable only with a session whose profile has `onboarding_completed_at IS NULL`; collects name, grade, phone, unique username (live check via `/api/username-available`, unique index) and photo.
3. **Gate**: `lib/auth/gate.ts` is a pure function used by `proxy.ts` and by `getViewer()`. Signed out → `/login?next=`; signed in but not onboarded → `/onboarding`; onboarded → cannot revisit onboarding or the sign-in pages.
4. **Every visit**: auth cookies are session cookies (`lib/supabase/cookies.ts` strips max-age/expires in the server, proxy and browser clients), so closing the browser ends the session and members sign in again with email + password. All progress lives in Postgres, never in the cookie.
5. **Forgotten passwords**: executives and admins set a temporary password from the admin console (`setTemporaryPassword`, audited); members change it in Settings.

## Permission model

Roles live on `profiles.role` (`admin`, `executive`, `chair`, `delegate`). Committee-level responsibility lives on `committee_memberships.membership_role` (`delegate`, `chair`, `co_chair`, `executive`). "Chair of X" always means a `chair`/`co_chair` membership in X, so a chair's reach is defined by data, not by the global role.

SQL helpers (`SECURITY DEFINER`, pinned `search_path`): `is_admin()`, `is_staff()` (admin or executive), `is_chair_of(c)`, `is_member_of(c)`, `chairs_member(p)`, `can_view_session(s)`, `can_view_task(t)`, `can_manage_task(t)`.

| Table | Read | Write |
| --- | --- | --- |
| profiles | own row; staff all; chairs their members | own safe columns (trigger blocks role, email, username change, onboarding flag); admin any |
| public_profiles (view) | all members: id, username, name, grade, avatar, role | — |
| committees | all | staff insert; staff or chair update; admin delete |
| committee_memberships | own; committee members; staff | staff or chair of that committee |
| weekly_sessions | non-draft to all; drafts to staff | staff |
| session_committees | rows of visible sessions; `chair_notes` column revoked, served by `session_chair_notes()` to chairs/staff | staff insert/delete; staff or chair update |
| tasks | assignee, creator, staff, chair of the committee, role/committee broadcast targets | staff; chair for their committee; assignee status only (trigger limits to not_started/in_progress/submitted, blocks closed tasks) |
| task_uploads | uploader; task managers | assignee while open, or managers |
| task_activity | task viewers | actor = self on visible tasks; status changes logged by trigger |
| materials | everyone / committee members / staff-only per `visibility` | staff; chairs for their committee |
| announcements | audience match (role, committee, session); author; staff | staff; chairs to their committee (trigger) |
| attendance_records | own; staff; chairs for their members | staff; chairs for their members |
| session_feedback | subject; author; staff; chairs for their members | staff; chairs for their members |
| committee_submissions | own; staff; chairs of the committee | members while `submissions_enabled` |
| resolution_links | own; committee members; chairs of the committee; staff | members insert their own; owner, chairs or staff update/delete |
| audit_logs | admin | staff (also written with the service role) |
| allowed_email_domains | all members | admin |

`lib/policy.ts` restates the same rules as pure TypeScript so server actions can fail with a clear message before touching the database, and so the rules are unit-tested. The database remains the authority.

Storage policies mirror the tables: evidence paths start with the task id, submissions with `committee/profile`, avatars with the profile id. Downloads never expose bucket URLs; `/api/files/[kind]/[id]` reads the row as the user and only then creates a 60-second signed URL.

## Data model notes

- `weekly_sessions` carry `theme`, `dress_code`, `general_agenda` in addition to the required fields.
- `tasks` require a target (person, role or committee) via a check constraint. `overdue` is applied by `mark_overdue_tasks()` (called when the calendar loads) and derived in analytics.
- `task_activity` records creation and every status change (trigger), uploads (trigger), removals, returns, completions and reopenings (server actions with notes).
- `session_feedback` holds post-session feedback per delegate.
- `task_templates` let staff assign the same brief to many delegates with a relative due date.
- `announcement_reads` gives per-user read status.

## Front-end conventions

- Server Components fetch; Client Components are limited to forms, dialogs, filters and charts.
- Mutations are server actions returning `ActionResult` (`ok`/`error`/`fieldErrors`). Nothing throws to the client; failures surface as inline errors or toasts.
- React Hook Form + Zod validate on the client; the same Zod schema runs on the server. `useRhfAction` bridges RHF to `useActionState`.
- No optimistic UI on status transitions: the server response is the truth, and `router.refresh()` re-renders.
- Theme tokens (navy, paper, gold) are CSS variables in `globals.css`; dark mode via `next-themes` class strategy.
- Accessibility: labelled fields with hint/error ids, `role="alert"` for errors, skip link, `aria-current` on navigation, keyboard-operable radio groups in roll call, charts with `role="img"` labels and tabular equivalents.
