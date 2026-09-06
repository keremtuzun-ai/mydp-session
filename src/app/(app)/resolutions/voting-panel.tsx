"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { castVote, clearVoting, closeVoting, openVoting } from "@/actions/voting";
import { VOTE_CHOICES, VOTE_LABEL, percent, voteOutcome, type VoteChoice, type VotingSnapshot } from "@/lib/voting";
import { cn, fmt } from "@/lib/utils";

const POLL_MS = 2000;

type Props = {
  delegationKey: string;
  delegation: string;
  /** The desk: opens, closes and clears the round and sees the live tally. */
  canManage: boolean;
  /** Members: cast a vote while the round is open. */
  canVote: boolean;
  compact?: boolean;
};

/**
 * Kahoot-style voting panel. Polls the tally every two seconds while mounted
 * (paused when the tab is hidden), so the desk watches votes arrive live.
 */
export function VotingPanel({ delegationKey, delegation, canManage, canVote, compact }: Props) {
  const [snap, setSnap] = useState<VotingSnapshot | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/votes/${encodeURIComponent(delegationKey)}`, { cache: "no-store" });
      if (res.ok) setSnap((await res.json()) as VotingSnapshot);
    } catch {
      /* keep the last snapshot; the next tick retries */
    }
  }, [delegationKey]);

  useEffect(() => {
    let alive = true;
    let first = true;
    // The first load always runs; later polls pause while the tab is hidden and resume on visibilitychange.
    const tick = () => {
      if (!alive) return;
      if (first || !document.hidden) void load();
      first = false;
      timer.current = window.setTimeout(tick, POLL_MS);
    };
    timer.current = window.setTimeout(tick, 0);
    const onVisible = () => !document.hidden && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, quiet = false) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message && !quiet) toast.success(r.message);
        await load();
      } else toast.error(r.error ?? "Something went wrong.");
    });

  if (!snap) return canManage || canVote ? <p className="doc-status">Checking voting…</p> : null;
  const { status, counts } = snap;

  if (status === "none") {
    if (canManage) {
      return (
        <div className="voting-panel">
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => openVoting({ key: delegationKey }))}>
            Open voting
          </button>
          <span className="small muted">Delegates will be asked to vote in favour, against or abstain.</span>
        </div>
      );
    }
    return null;
  }

  const outcome = voteOutcome(counts);
  const showTally = canManage || status === "closed";

  return (
    <div className={cn("voting-panel", status === "open" && "is-open", compact && "is-compact")} aria-live="polite">
      <div className="voting-head">
        <span className={cn("chip", status === "open" ? "chip-red" : "chip-navy")}>
          {status === "open" ? <span className="voting-dot" aria-hidden /> : null}
          {status === "open" ? "Voting open" : "Voting closed"}
        </span>
        {canManage ? (
          <span className="voting-count">
            <strong>{counts.total}</strong> of {snap.eligible} voted
          </span>
        ) : null}
        {status === "closed" ? (
          <span className="small muted">
            {outcome === "adopted" ? "Adopted" : outcome === "rejected" ? "Rejected" : outcome === "tied" ? "Tied" : "No votes cast"}
            {snap.closedAt ? ` · closed ${fmt(snap.closedAt, "HH:mm")}` : ""}
          </span>
        ) : null}
      </div>

      {canVote && status === "open" ? (
        <div className="vote-buttons" role="group" aria-label={`Vote on ${delegation}'s resolution`}>
          {VOTE_CHOICES.map((c) => (
            <button
              key={c}
              type="button"
              className={cn("vote-btn", `vote-${c}`, snap.myVote === c && "active")}
              aria-pressed={snap.myVote === c}
              disabled={pending}
              onClick={() => run(() => castVote({ key: delegationKey, choice: c }), true)}
            >
              {VOTE_LABEL[c]}
            </button>
          ))}
        </div>
      ) : null}
      {canVote && status === "open" ? (
        <p className="m-0 small muted">{snap.myVote ? `Your vote: ${VOTE_LABEL[snap.myVote]}. You can change it until the desk closes voting.` : "Choose one. You can change it until the desk closes voting."}</p>
      ) : null}
      {canVote && status === "closed" && snap.myVote ? <p className="m-0 small muted">Your vote: {VOTE_LABEL[snap.myVote]}.</p> : null}

      {showTally ? (
        <ul className="tally">
          {VOTE_CHOICES.map((c) => (
            <li key={c} className={`tally-${c}`}>
              <span className="tally-label">{VOTE_LABEL[c]}</span>
              <span className="tally-bar" aria-hidden>
                <span style={{ width: `${percent(counts[c], counts.total)}%` }} />
              </span>
              <span className="tally-num">{counts[c]}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          {status === "open" ? (
            <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => closeVoting({ key: delegationKey }))}>
              Close voting
            </button>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => openVoting({ key: delegationKey }))}>
              Reopen voting
            </button>
          )}
          <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run(() => clearVoting({ key: delegationKey }))}>
            Clear votes
          </button>
        </div>
      ) : null}

      {canManage && snap.voters && snap.voters.length > 0 ? (
        <details className="task-files">
          <summary>
            Who voted <span className="tab-count">{snap.voters.length}</span>
          </summary>
          <ul className="task-file-list">
            {snap.voters.map((v, i) => (
              <li key={i} className="task-file">
                <div className="task-file-meta">
                  <strong>{v.name}</strong>
                  <span className="muted small">
                    {v.delegation ? `${v.delegation} · ` : ""}
                    {fmt(v.votedAt, "HH:mm:ss")}
                  </span>
                </div>
                <span className={cn("chip", v.choice === "favour" ? "chip-navy" : v.choice === "against" ? "chip-red" : "")}>{VOTE_LABEL[v.choice as VoteChoice]}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
