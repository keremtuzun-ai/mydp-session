import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict, isPast } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/env";

/** Format a date in the programme's timezone, wherever the server runs. */
export function fmt(value: string | Date, pattern: string) {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, pattern);
}

/** Same calendar day in the programme's timezone. */
function sameZonedDay(a: Date, b: Date) {
  return fmt(a, "yyyy-MM-dd") === fmt(b, "yyyy-MM-dd");
}

/** A wall-clock time (in the programme's timezone) on a given day, as an instant. */
export function zonedInstant(year: number, monthIndex: number, day: number, hour: number, minute: number) {
  return fromZonedTime(new Date(year, monthIndex, day, hour, minute, 0, 0), APP_TIMEZONE);
}

export function zonedNow() {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return fmt(value, "EEE d MMM yyyy, HH:mm");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return fmt(value, "EEE d MMM yyyy");
}

export function formatTimeRange(start: string | Date, end: string | Date | null | undefined) {
  if (!end) return fmt(start, "HH:mm");
  return `${fmt(start, "HH:mm")} – ${fmt(end, "HH:mm")}`;
}

export function relativeDue(value: string | Date | null | undefined) {
  if (!value) return "No due date";
  const d = new Date(value);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  if (sameZonedDay(d, now)) return `Today, ${fmt(d, "HH:mm")}`;
  if (sameZonedDay(d, tomorrow)) return `Tomorrow, ${fmt(d, "HH:mm")}`;
  const distance = formatDistanceToNowStrict(d, { addSuffix: true });
  return isPast(d) ? `Due ${distance}` : `Due ${distance}`;
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
