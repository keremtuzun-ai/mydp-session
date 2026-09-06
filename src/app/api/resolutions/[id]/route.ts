import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inline access to a resolution's file for the in-app viewer. The row is read
 * AS THE USER (RLS: uploader, the desk, or anyone once the desk has published
 * it), then a short-lived signed URL is minted with the service key. The URL
 * is served inline, never with a download disposition.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/resolutions/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data } = await supabase.from("task_uploads").select("storage_path, mime_type, file_name").eq("id", id).maybeSingle();
  if (!data?.storage_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage.from("task-evidence").createSignedUrl(data.storage_path, 300);
  if (error || !signed) return NextResponse.json({ error: "Could not open the document" }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl, mime: data.mime_type, fileName: data.file_name }, { headers: { "cache-control": "no-store" } });
}
