/**
 * Integration tests against a real Supabase project with the seed applied.
 * They run only when NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * and SEED_PASSWORD are present (e.g. `npm run test -- --env-file=.env.local`
 * via `tsx`, or exporting them in the shell). Otherwise they are skipped.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD;
const domain = (process.env.ALLOWED_SCHOOL_DOMAINS ?? "").split(",")[0]?.trim();
const enabled = Boolean(url && anon && password && domain && process.env.RUN_RLS_TESTS === "1");

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(url!, anon!, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: password! });
  if (error) throw new Error(`Cannot sign in ${email}: ${error.message}`);
  return client;
}

describe.skipIf(!enabled)("Row Level Security (live)", () => {
  let ayse: SupabaseClient<Database>;
  let mehmet: SupabaseClient<Database>;
  let unscChair: SupabaseClient<Database>;
  let whoChair: SupabaseClient<Database>;
  let admin: SupabaseClient<Database>;

  beforeAll(async () => {
    [ayse, mehmet, unscChair, whoChair, admin] = await Promise.all([
      signIn(`ayse.demir@${domain}`),
      signIn(`mehmet.kaya@${domain}`),
      signIn(`selin.arslan@${domain}`),
      signIn(`emre.yildiz@${domain}`),
      signIn(`admin@${domain}`),
    ]);
  });

  it("a delegate cannot read another delegate's task", async () => {
    const { data: mine } = await ayse.from("tasks").select("id").not("assigned_to_profile_id", "is", null);
    expect((mine ?? []).length).toBeGreaterThan(0);
    const { data: theirs } = await mehmet.from("tasks").select("id").in("id", (mine ?? []).map((t) => t.id));
    const ayseId = (await ayse.auth.getUser()).data.user!.id;
    const { data: mineOnly } = await ayse.from("tasks").select("id").eq("assigned_to_profile_id", ayseId);
    for (const t of mineOnly ?? []) expect((theirs ?? []).map((x) => x.id)).not.toContain(t.id);
  });

  it("a chair cannot modify another committee's tasks", async () => {
    const { data: whoTasks } = await whoChair.from("tasks").select("id, title").limit(1);
    const target = whoTasks?.[0];
    expect(target).toBeTruthy();
    const { data } = await unscChair.from("tasks").update({ title: "hijacked" }).eq("id", target!.id).select("id");
    expect(data ?? []).toHaveLength(0); // RLS filters the row: zero rows updated
    const { data: after } = await whoChair.from("tasks").select("title").eq("id", target!.id).single();
    expect(after?.title).not.toBe("hijacked");
  });

  it("a delegate cannot see other members' private contact details", async () => {
    const { data } = await ayse.from("profiles").select("id, phone, school_email");
    expect(data?.length).toBe(1);
  });

  it("admin sees every profile and every task", async () => {
    const { data: profiles } = await admin.from("profiles").select("id");
    expect((profiles ?? []).length).toBeGreaterThan(5);
    const { data: tasks } = await admin.from("tasks").select("id");
    const { data: ayseTasks } = await ayse.from("tasks").select("id");
    expect((tasks ?? []).length).toBeGreaterThan((ayseTasks ?? []).length);
  });

  it("a delegate cannot insert an upload against a task that is not theirs", async () => {
    const mehmetId = (await mehmet.auth.getUser()).data.user!.id;
    const ayseId = (await ayse.auth.getUser()).data.user!.id;
    const { data: ayseTask } = await ayse.from("tasks").select("id").eq("assigned_to_profile_id", ayseId).limit(1).single();
    const { error } = await mehmet.from("task_uploads").insert({
      task_id: ayseTask!.id, uploaded_by: mehmetId, title: "x", storage_path: `${ayseTask!.id}/nope.pdf`, file_name: "nope.pdf", mime_type: "application/pdf", size_bytes: 10,
    });
    expect(error).toBeTruthy();
  });

  it("an executive can create a task and read it back in the same call", async () => {
    const exec = await signIn(`leyla.sahin@${domain}`);
    const execId = (await exec.auth.getUser()).data.user!.id;
    const { data, error } = await exec.from("tasks").insert({ title: "rls returning check", committee_label: "TEST", assigned_role: "delegate", created_by: execId }).select("id").single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    if (data?.id) await exec.from("tasks").delete().eq("id", data.id);
  });

  it("a delegate cannot promote themselves", async () => {
    const ayseId = (await ayse.auth.getUser()).data.user!.id;
    const { error } = await ayse.from("profiles").update({ role: "admin" }).eq("id", ayseId);
    expect(error).toBeTruthy();
  });
});
