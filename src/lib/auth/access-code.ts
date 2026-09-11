import { z } from "zod";

/**
 * Access codes: 12 characters drawn from the capital letters (without I and
 * O, which read like 1 and 0) and the digits, with at least one of each.
 * Pure helpers, usable on the server, in the browser and from scripts.
 */
export const ACCESS_CODE_LENGTH = 12;
export const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
export const ACCESS_CODE_RE = /^[A-Z0-9]{12}$/;

/** Upper-cases and drops spaces, dashes and anything else a member may type between the characters. */
export function normalizeAccessCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isAccessCode(value: string) {
  return ACCESS_CODE_RE.test(value);
}

/** Has the shape the generator guarantees: only alphabet characters, a letter and a digit. */
export function isWellFormedAccessCode(value: string) {
  if (!isAccessCode(value)) return false;
  if (!/[A-Z]/.test(value) || !/[0-9]/.test(value)) return false;
  return [...value].every((c) => ACCESS_CODE_ALPHABET.includes(c));
}

/** Uniform draw from [0, max) with Web Crypto (rejection sampling, no modulo bias). */
function secureRandomInt(max: number) {
  const limit = 256 - (256 % max);
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0]! < limit) return buf[0]! % max;
  }
}

/** A fresh random code with at least one letter and one digit (uniqueness is the caller's check). */
export function generateAccessCode(random: (max: number) => number = secureRandomInt): string {
  for (;;) {
    let code = "";
    for (let i = 0; i < ACCESS_CODE_LENGTH; i++) code += ACCESS_CODE_ALPHABET[random(ACCESS_CODE_ALPHABET.length)];
    if (isWellFormedAccessCode(code)) return code;
  }
}

/** "ABCD-EFGH-1234": easier to read out and to copy. */
export function formatAccessCode(code: string) {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export const accessCodeSchema = z
  .string()
  .transform(normalizeAccessCode)
  .refine((v) => v.length === ACCESS_CODE_LENGTH, `Enter the ${ACCESS_CODE_LENGTH}-character access code you were given`)
  .refine(isAccessCode, "The access code contains only capital letters and digits");

export const MEMBER_TIERS = ["junior", "senior"] as const;
export type MemberTier = (typeof MEMBER_TIERS)[number];
export const TIER_LABEL: Record<MemberTier, string> = { junior: "Junior", senior: "Senior" };
export function isMemberTier(v: unknown): v is MemberTier {
  return typeof v === "string" && (MEMBER_TIERS as readonly string[]).includes(v);
}

/** Members created by the desk have no real email; Supabase Auth still needs one. Never mailed. */
export const MEMBER_EMAIL_DOMAIN = "members.example.com";
export function memberEmailForCode(code: string) {
  return `${code.toLowerCase()}@${MEMBER_EMAIL_DOMAIN}`;
}
export function isMemberEmail(email: string) {
  return email.toLowerCase().endsWith(`@${MEMBER_EMAIL_DOMAIN}`);
}

/**
 * Builds a username from a name and surname: Turkish letters folded to
 * ASCII, lowercase, hyphens between the parts. "Kerem Tüzün" → "kerem-tuzun".
 */
export function usernameFromName(firstName: string, lastName: string) {
  const fold = (s: string) =>
    s
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .replace(/ı/g, "i")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const base = [fold(firstName), fold(lastName)].filter(Boolean).join("-").slice(0, 24).replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base}-member`.replace(/^-/, "").slice(0, 24);
}
