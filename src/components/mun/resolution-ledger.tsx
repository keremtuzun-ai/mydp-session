import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/mun/empty-state";
import { DeleteResolutionButton } from "@/components/mun/resolution-form";
import { RESOLUTION_KIND_LABEL, type RESOLUTION_KINDS } from "@/lib/validation/schemas";
import { formatDateTime } from "@/lib/utils";

export type ResolutionRow = {
  id: string;
  title: string;
  url: string;
  kind: string;
  notes: string | null;
  updated_at: string;
  authorName: string;
  delegation: string | null;
  committeeAcronym?: string;
  canManage: boolean;
};

function host(url: string) {
  try {
    const h = new URL(url).hostname;
    if (h === "docs.google.com") return "Google Docs";
    if (h.endsWith("sharepoint.com") || h.endsWith("office.com")) return "Microsoft 365";
    if (h === "www.overleaf.com") return "Overleaf";
    return h.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

/** Committee-wide ledger of shared documents, portal style. */
export function ResolutionLedger({ rows, emptyDescription }: { rows: ResolutionRow[]; emptyDescription?: string }) {
  if (rows.length === 0) return <EmptyState title="No documents shared yet" description={emptyDescription} className="empty-state-sm" />;
  return (
    <ul className="ledger">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="row-title inline-flex items-center gap-1.5">
                  {r.title}
                  <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                </a>
                <span className="chip chip-navy">{RESOLUTION_KIND_LABEL[r.kind as (typeof RESOLUTION_KINDS)[number]] ?? r.kind}</span>
                {r.committeeAcronym ? <span className="chip">{r.committeeAcronym}</span> : null}
              </div>
              <div className="row-sub">
                {r.authorName}
                {r.delegation ? ` · ${r.delegation}` : ""} · {host(r.url)} · updated {formatDateTime(r.updated_at)}
              </div>
              {r.notes ? <p className="m-0 mt-1 small">{r.notes}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                Open
              </a>
              {r.canManage ? <DeleteResolutionButton id={r.id} /> : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
