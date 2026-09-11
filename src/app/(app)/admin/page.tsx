import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/session";
import { UsersTable } from "./users-table";
import { CreateMemberForm } from "./create-member-form";

export const metadata: Metadata = { title: "Members" };

export default async function AdminUsersPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [{ data: profiles }, { data: codes }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("display_name"),
    supabase.from("access_codes").select("code, profile_id"),
  ]);
  const codeByProfile = Object.fromEntries((codes ?? []).map((c) => [c.profile_id, c.code]));
  return (
    <div className="flex flex-col gap-6">
      <section className="card">
        <div className="section-head">
          <h2>Create an account</h2>
        </div>
        <CreateMemberForm />
      </section>
      <UsersTable rows={profiles ?? []} codes={codeByProfile} selfId={viewer.userId} />
    </div>
  );
}
