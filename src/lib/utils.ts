import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "EEE d MMM yyyy, HH:mm");
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "EEE d MMM yyyy");
}

export function formatTimeRange(start: string | Date, end: string | Date | null | undefined) {
  const s = new Date(start);
  if (!end) return format(s, "HH:mm");
  return `${format(s, "HH:mm")} – ${format(new Date(end), "HH:mm")}`;
}

export function relativeDue(value: string | Date | null | undefined) {
  if (!value) return "No due date";
  const d = new Date(value);
  if (isToday(d)) return `Today, ${format(d, "HH:mm")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "HH:mm")}`;
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
