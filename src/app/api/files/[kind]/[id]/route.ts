import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const KINDS = {
  "task-uploads": { table: "task_uploads", bucket: "task-evidence" },
  materials: { table: "materials", bucket: "materials" },
  submissions: { table: "committee_submissions", bucket: "committee-submissions" },
} as const;

/**
 * Downloads are served as short-lived signed URLs. The row is first read AS
 * THE USER (so RLS decides whether they may see it); only then is the signed
 * URL minted with the service-role key.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/files/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const def = KINDS[kind as keyof typeof KINDS];
  if (!def) return NextResponse.json({ error: "Unknown file kind" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let storagePath: string | null = null;
  let fileName: string | null = null;
  if (def.table === "task_uploads") {
    const { data } = await supabase.from("task_uploads").select("storage_path, file_name, external_url").eq("id", id).maybeSingle();
    if (data?.external_url && !data.storage_path) return NextResponse.redirect(data.external_url);
    storagePath = data?.storage_path ?? null;
    fileName = data?.file_name ?? null;
  } else if (def.table === "materials") {
    const { data } = await supabase.from("materials").select("storage_path, file_name, external_url").eq("id", id).maybeSingle();
    if (data?.external_url && !data.storage_path) return NextResponse.redirect(data.external_url);
    storagePath = data?.storage_path ?? null;
    fileName = data?.file_name ?? null;
  } else {
    const { data } = await supabase.from("committee_submissions").select("storage_path, file_name").eq("id", id).maybeSingle();
    storagePath = data?.storage_path ?? null;
    fileName = data?.file_name ?? null;
  }
  if (!storagePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(def.bucket).createSignedUrl(storagePath, 60, { download: fileName ?? undefined });
  if (error || !data) return NextResponse.json({ error: "Could not create a download link" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl, { headers: { "cache-control": "no-store" } });
}
