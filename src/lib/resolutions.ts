/** Pure helpers for the resolutions feature (no server-only imports so they can be unit-tested). */

/** Delegations are grouped case- and whitespace-insensitively: "France", "france " and "FRANCE" are one delegation. */
export function delegationKey(delegation: string) {
  return delegation.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Submissions that are not affiliated with a delegation (the dialog tells members to write N/A). */
export function isNoDelegation(delegation: string | null | undefined) {
  if (!delegation) return true;
  const k = delegationKey(delegation);
  return k === "" || /^(n\/?a|none|no delegation|-+|—)$/.test(k);
}

/** Title-case a delegation for display when the delegate typed it in lower case. */
export function displayDelegation(delegation: string) {
  const t = delegation.trim().replace(/\s+/g, " ");
  return t === t.toLowerCase() ? t.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : t;
}

export type PreviewKind = "pdf" | "image" | "docx" | "unknown";

export function previewKind(mime: string | null | undefined): PreviewKind {
  if (!mime) return "unknown";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "unknown";
}

/** Keep mammoth's HTML tame: no scripts, no inline handlers, only http(s) links. */
export function sanitizeDocHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\shref\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _q, a, b) => {
      const url = String(a ?? b ?? "").trim();
      return /^https?:\/\//i.test(url) ? ` href="${url}" target="_blank" rel="noopener noreferrer"` : "";
    })
    .replace(/\ssrc\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, _q, a, b) => {
      const url = String(a ?? b ?? "").trim();
      return /^(data:image\/|https?:\/\/)/i.test(url) ? ` src="${url}"` : "";
    });
}
