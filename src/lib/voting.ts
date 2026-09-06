/** Pure helpers for resolution voting (shared by server and client). */

export const VOTE_CHOICES = ["favour", "against", "abstain"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];
export const VOTE_LABEL: Record<VoteChoice, string> = { favour: "In favour", against: "Against", abstain: "Abstain" };

export type VoteCounts = { favour: number; against: number; abstain: number; total: number };
export type VotingStatus = "none" | "open" | "closed";

export type VotingSnapshot = {
  status: VotingStatus;
  openedAt: string | null;
  closedAt: string | null;
  counts: VoteCounts;
  /** Members who may vote (everyone who is not on the desk). */
  eligible: number;
  myVote: VoteChoice | null;
  /** Only present for the desk. */
  voters?: { name: string; delegation: string | null; choice: VoteChoice; votedAt: string }[];
};

export function isVoteChoice(v: unknown): v is VoteChoice {
  return typeof v === "string" && (VOTE_CHOICES as readonly string[]).includes(v);
}

/** Outcome wording once a round is closed: simple majority of votes cast, abstentions not counted. */
export function voteOutcome(c: VoteCounts): "adopted" | "rejected" | "tied" | "no-votes" {
  if (c.favour + c.against === 0) return "no-votes";
  if (c.favour > c.against) return "adopted";
  if (c.against > c.favour) return "rejected";
  return "tied";
}

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
