import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TemplatesManager } from "./templates-manager";

export const metadata: Metadata = { title: "Admin · Task templates" };

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const [{ data: templates }, { data: committees }, { data: sessions }] = await Promise.all([
    supabase.from("task_templates").select("*").order("title"),
    supabase.from("committees").select("id, acronym").order("acronym"),
    supabase.from("weekly_sessions").select("id, title").gte("starts_at", new Date().toISOString()).order("starts_at"),
  ]);
  const { data: memberships } = await supabase.from("committee_memberships").select("profile_id, committee_id, membership_role").eq("membership_role", "delegate");
  const { data: names } = await supabase.from("public_profiles").select("id, display_name, username");
  const nameMap = new Map((names ?? []).map((n) => [n.id, n.display_name ?? n.username ?? "?"]));
  const members = (memberships ?? []).map((m) => ({ id: m.profile_id, committee_id: m.committee_id, name: nameMap.get(m.profile_id) ?? "?" }));
  return <TemplatesManager templates={templates ?? []} committees={committees ?? []} sessions={sessions ?? []} members={members} />;
}
