/**
 * Central place for reading configuration. Anything not prefixed with
 * NEXT_PUBLIC_ is only ever read on the server.
 */

export function getAllowedSchoolDomains(source: string | undefined = process.env.ALLOWED_SCHOOL_DOMAINS): string[] {
  return (source ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter((d) => d.length > 0);
}

export const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "MUN Session Hub";
export const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "the school";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** IANA zone used for every server-rendered date; Vercel renders in UTC otherwise. */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE ?? "Europe/Istanbul";

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024);

/** Secret path segment of the executive link (/exec-invite/<token>). Empty disables the link. */
export function getExecInviteToken(): string {
  return (process.env.EXEC_INVITE_TOKEN ?? "").trim();
}

/** Password of the shared executive account, asked for on the secret link. Server only. */
export function getExecSharedPassword(): string {
  return (process.env.EXEC_SHARED_PASSWORD ?? "").trim();
}

/** Email of the shared executive account: secretariat@<first allowed domain> unless overridden. */
export function execAccountEmail(): string {
  const override = (process.env.EXEC_ACCOUNT_EMAIL ?? "").trim().toLowerCase();
  if (override) return override;
  const d = getAllowedSchoolDomains()[0];
  return d ? `secretariat@${d}` : "";
}
