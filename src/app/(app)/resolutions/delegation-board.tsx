"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { publishResolution, unpublishResolution } from "@/actions/resolutions";
import { fmt, cn } from "@/lib/utils";
import { VotingPanel } from "./voting-panel";

type Doc = { uploadId: string; title: string; fileName: string | null; createdAt: string; authorName: string; taskTitle: string };
export type BoardGroup = { key: string; delegation: string; docs: Doc[]; published: Doc | null; publishedAt: string | null };

/** The desk's list of delegations. Pressing a delegation shows its latest document to every member; pressing again hides it. */
export function DelegationBoard({ groups }: { groups: BoardGroup[] }) {
  return (
    <div className="delegation-grid">
      {groups.map((g) => (
        <DelegationCard key={g.key} group={g} />
      ))}
    </div>
  );
}

function DelegationCard({ group: g }: { group: BoardGroup }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const visible = Boolean(g.published);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message) toast.success(r.message);
        router.refresh();
      } else toast.error(r.error ?? "Something went wrong.");
    });
  const toggle = () => run(() => (visible ? unpublishResolution({ key: g.key }) : publishResolution({ uploadId: g.docs[0]!.uploadId })));

  return (
    <section className={cn("card delegation-card", visible && "is-visible")} aria-labelledby={`del-${g.key}`}>
      <button type="button" className={cn("delegation-btn", visible && "active")} onClick={toggle} disabled={pending} aria-pressed={visible}>
        <span className="delegation-name" id={`del-${g.key}`}>{g.delegation}</span>
        <span className="delegation-state">
          {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
          {pending ? "Saving…" : visible ? "Visible to delegates" : "Hidden from delegates"}
        </span>
      </button>
      <div className="delegation-body">
        {visible && g.published ? (
          <>
            <p className="m-0 small">
              Showing <strong>{g.published.title}</strong> by {g.published.authorName}
              {g.publishedAt ? <span className="muted"> · shared {fmt(g.publishedAt, "d MMM HH:mm")}</span> : null}
            </p>
            <div className="mt-3">
              <VotingPanel delegationKey={g.key} delegation={g.delegation} canManage canVote={false} compact />
            </div>
          </>
        ) : (
          <p className="m-0 small muted">Press the delegation to show its latest document to every delegate.</p>
        )}
        <details className="task-files mt-2">
          <summary>
            Submissions <span className="tab-count">{g.docs.length}</span>
          </summary>
          <ul className="task-file-list">
            {g.docs.map((d) => {
              const isShown = g.published?.uploadId === d.uploadId;
              return (
                <li key={d.uploadId} className="task-file">
                  <div className="task-file-meta">
                    <strong>{d.title}</strong>
                    <span className="muted small">
                      {d.taskTitle} · {d.authorName} · {fmt(d.createdAt, "d MMM HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/resolutions/${encodeURIComponent(g.key)}?upload=${d.uploadId}`} className="btn btn-quiet btn-sm">
                      Preview
                    </Link>
                    {isShown ? (
                      <span className="chip chip-navy">Shown</span>
                    ) : (
                      <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => publishResolution({ uploadId: d.uploadId }))}>
                        Show this one
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
