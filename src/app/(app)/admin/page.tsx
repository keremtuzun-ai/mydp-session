import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminUsersPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("role").order("display_name");
  return <UsersTable rows={profiles ?? []} selfId={viewer.userId} />;
}
