import { execAccountEmail } from "@/lib/env";

/** True for the single shared executive account (secret link + password). */
export function isSharedExecAccount(profile: { school_email: string }) {
  const e = execAccountEmail();
  return Boolean(e) && profile.school_email.toLowerCase() === e.toLowerCase();
}
