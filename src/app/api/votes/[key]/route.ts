import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { isStaffRole } from "@/lib/auth/roles";
import { delegationKey } from "@/lib/resolutions";
import { isVoteChoice, type VotingSnapshot } from "@/lib/voting";

/**
 * Live tally for one resolution's voting round, polled by the voting panel.
 * Everything is read as the signed-in user: the aggregate comes from a
 * definer function, individual votes only reach the desk (RLS).
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/votes/[key]">) {
  const { key: raw } = await ctx.params;
  const key = delegationKey(decodeURIComponent(raw));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const [{ data: profile }, { data: voting }, { data: counts }, { count: eligible }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("resolution_votings").select("*").eq("delegation_key", key).maybeSingle(),
    supabase.rpc("resolution_vote_counts", { k: key }),
    supabase.from("public_profiles").select("id", { count: "exact", head: true }).in("role", ["delegate", "chair"]),
  ]);
  const staff = isStaffRole(profile?.role ?? "delegate");
  const c = counts?.[0] ?? { favour: 0, against: 0, abstain: 0, total: 0 };
  const snapshot: VotingSnapshot = {
    status: voting ? (voting.status === "open" ? "open" : "closed") : "none",
    openedAt: voting?.opened_at ?? null,
    closedAt: voting?.closed_at ?? null,
    counts: { favour: c.favour, against: c.against, abstain: c.abstain, total: c.total },
    eligible: eligible ?? 0,
    myVote: null,
  };
  if (voting) {
    if (staff) {
      const { data: votes } = await supabase.from("resolution_votes").select("profile_id, choice, voter_delegation, voted_at").eq("delegation_key", key).order("voted_at", { ascending: false });
      const names = await getNameMap(supabase, (votes ?? []).map((v) => v.profile_id));
      snapshot.voters = (votes ?? []).flatMap((v) =>
        isVoteChoice(v.choice) ? [{ name: nameOf(names, v.profile_id), delegation: v.voter_delegation, choice: v.choice, votedAt: v.voted_at }] : [],
      );
    } else {
      const { data: mine } = await supabase.from("resolution_votes").select("choice").eq("delegation_key", key).eq("profile_id", user.id).maybeSingle();
      snapshot.myVote = mine && isVoteChoice(mine.choice) ? mine.choice : null;
    }
  }
  return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
}
