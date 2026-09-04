import { getAllowedSchoolDomains } from "@/lib/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) return null;
  const at = normalized.lastIndexOf("@");
  return normalized.slice(at + 1);
}

/**
 * True only when the address is well-formed AND its domain is in the
 * configured allow-list. An empty allow-list rejects everything: the app must
 * never silently become open to the public because of a missing env var.
 */
export function isAllowedSchoolEmail(email: string, domains: string[] = getAllowedSchoolDomains()): boolean {
  const domain = emailDomain(email);
  if (!domain || domains.length === 0) return false;
  return domains.includes(domain);
}
