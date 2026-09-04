import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TemplatesManager } from "./templates-manager";

export const metadata: Metadata = { title: "Admin · Task templates" };

export default async function AdminTemplatesPage() {
  const supabase = await createClient();
  const [{ data: templates }, { data: sessions }, { data: delegates }] = await Promise.all([
    supabase.from("task_templates").select("*").order("title"),
    supabase.from("weekly_sessions").select("id, title").gte("starts_at", new Date().toISOString()).order("starts_at"),
    supabase.from("public_profiles").select("id, display_name, username").eq("role", "delegate").not("display_name", "is", null).order("display_name"),
  ]);
  const members = (delegates ?? []).map((d) => ({ id: d.id, committee_id: "", name: d.display_name ?? d.username ?? "?" }));
  return <TemplatesManager templates={templates ?? []} committees={[]} sessions={sessions ?? []} members={members} />;
}
