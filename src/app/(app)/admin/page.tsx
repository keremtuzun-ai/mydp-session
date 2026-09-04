import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminUsersPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: profiles }, { data: memberships }, { data: committees }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("display_name"),
    supabase.from("committee_memberships").select("profile_id, committee_id, membership_role"),
    supabase.from("committees").select("id, acronym"),
  ]);
  const acronym = new Map((committees ?? []).map((c) => [c.id, c.acronym]));
  const rows = (profiles ?? []).map((p) => ({
    ...p,
    committees: (memberships ?? []).filter((m) => m.profile_id === p.id).map((m) => `${acronym.get(m.committee_id) ?? "?"}${m.membership_role !== "delegate" ? ` (${m.membership_role.replace("_", "-")})` : ""}`),
  }));
  return <UsersTable rows={rows} selfId={viewer.userId} committees={committees ?? []} />;
}
