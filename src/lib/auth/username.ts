import { z } from "zod";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const USERNAME_RE = /^[a-z0-9-]+$/;

/** Names that would collide with routes or read as official accounts. */
export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "staff", "chair", "delegate",
  "executive", "mun", "api", "auth", "login", "logout", "settings", "dashboard", "me",
]);

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(USERNAME_RE, "Use only lowercase letters, numbers and hyphens")
  .refine((v) => !v.startsWith("-") && !v.endsWith("-"), "Username cannot start or end with a hyphen")
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved");

export function isValidUsernameFormat(value: string) {
  return usernameSchema.safeParse(value).success;
}
