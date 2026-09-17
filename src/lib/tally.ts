import { delegationKey, displayDelegation, isNoDelegation } from "@/lib/resolutions";

export const TALLY_KINDS = ["speeches", "pois", "objections"] as const;
export type TallyKind = (typeof TALLY_KINDS)[number];
export const TALLY_LABEL: Record<TallyKind, string> = { speeches: "Speeches", pois: "POIs", objections: "Objections" };

export const MAX_COUNTRIES = 100;

export function isTallyKind(v: unknown): v is TallyKind {
  return typeof v === "string" && (TALLY_KINDS as readonly string[]).includes(v);
}

/** "France, germany\nJapan; France" -> ["France", "Germany", "Japan"]: split on commas, semicolons or new lines, deduplicated case-insensitively. */
export function parseCountries(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,;\n\r]+/)) {
    if (isNoDelegation(part)) continue;
    const name = displayDelegation(part).slice(0, 60);
    const key = delegationKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** The tally rows for one task: the countries typed in the task first, then any other delegation that submitted to it. */
export function tallyCountries(typed: string[], submitted: (string | null)[]): { key: string; country: string }[] {
  const seen = new Set<string>();
  const out: { key: string; country: string }[] = [];
  for (const raw of [...typed, ...submitted]) {
    if (!raw || isNoDelegation(raw)) continue;
    const country = displayDelegation(raw);
    const key = delegationKey(country);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, country });
  }
  return out;
}
