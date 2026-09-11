"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { castVote, clearVoting, closeVoting, openVoting } from "@/actions/voting";
import { VOTE_CHOICES, VOTE_LABEL, percent, voteOutcome, type VoteChoice, type VotingSnapshot } from "@/lib/voting";
import { votingTopic } from "@/lib/realtime/topics";
import { useLiveChannel } from "@/hooks/use-live-channel";
import { cn, fmt } from "@/lib/utils";

type Props = {
  delegationKey: string;
  delegation: string;
  /** The desk: opens, closes and clears the round and sees who voted. */
  canManage: boolean;
  /** Members: cast a vote while the round is open. */
  canVote: boolean;
  compact?: boolean;
};

/**
 * Kahoot-style voting panel. Everyone sees the live tally: the server
 * broadcasts on the resolution's topic whenever the round changes or a vote
 * lands, and the panel refetches the snapshot (individual votes stay with the
 * desk, RLS decides). A slow fallback poll covers a dropped socket.
 */
export function VotingPanel({ delegationKey, delegation, canManage, canVote, compact }: Props) {
  const [snap, setSnap] = useState<VotingSnapshot | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/votes/${encodeURIComponent(delegationKey)}`, { cache: "no-store" });
      if (res.ok) setSnap((await res.json()) as VotingSnapshot);
    } catch {
      /* keep the last snapshot; the next event or poll retries */
    }
  }, [delegationKey]);

  useLiveChannel(votingTopic(delegationKey), load);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, quiet = false) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (r.message && !quiet) toast.success(r.message);
        await load();
      } else toast.error(r.error ?? "Something went wrong.");
    });

  if (!snap) return <p className="doc-status">Checking voting…</p>;
  const { status, counts } = snap;

  if (status === "none") {
    if (canManage) {
      return (
        <div className="voting-panel">
          <button type="button" className="btn btn-sm" disabled={pending} onClick={() => run(() => openVoting({ key: delegationKey }))}>
            Open voting
          </button>
        </div>
      );
    }
    return <p className="m-0 small muted">Voting has not been opened yet. This page updates on its own when it is.</p>;
  }

  const outcome = voteOutcome(counts);

  return (
    <div className={cn("voting-panel", status === "open" && "is-open", compact && "is-compact")} aria-live="polite">
      <div className="voting-head">
        <span className={cn("chip", status === "open" ? "chip-red" : "chip-navy")}>
          {status === "open" ? <span className="voting-dot" aria-hidden /> : null}
          {status === "open" ? "Voting open" : "Voting closed"}
        </span>
        <span className="voting-count">
          <strong>{counts.total}</strong> of {snap.eligible} voted
        </span>
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
        <p className="m-0 small muted">{snap.myVote ? `Your vote: ${VOTE_LABEL[snap.myVote]}.` : "You can change your vote until voting closes."}</p>
      ) : null}
      {canVote && status === "closed" && snap.myVote ? <p className="m-0 small muted">Your vote: {VOTE_LABEL[snap.myVote]}.</p> : null}

      <ul className="tally" aria-label="Live tally">
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
