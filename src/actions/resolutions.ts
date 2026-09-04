"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActor } from "@/lib/auth/actor";
import { resolutionLinkSchema, uuid } from "@/lib/validation/schemas";
import { canPostResolution, canManageResolution } from "@/lib/policy";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

function input(formData: FormData) {
  return {
    committee_id: formData.get("committee_id"),
    title: formData.get("title"),
    url: formData.get("url"),
    kind: formData.get("kind") ?? "draft_resolution",
    notes: formData.get("notes") ?? "",
  };
}

async function revalidate(committeeId: string) {
  revalidatePath("/resolutions");
  revalidatePath("/dashboard");
  const supabase = await createClient();
  const { data } = await supabase.from("committees").select("slug").eq("id", committeeId).maybeSingle();
  if (data?.slug) revalidatePath(`/committees/${data.slug}`);
}

/** A delegate shares the link to their document with the committee. */
export async function addResolutionLink(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  const parsed = resolutionLinkSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  if (!canPostResolution(actor, parsed.data.committee_id)) return fail("You can only share documents with a committee you belong to.");
  const supabase = await createClient();
  const { error } = await supabase.from("resolution_links").insert({ ...parsed.data, profile_id: actor.id });
  if (error) return fail(describeDbError(error));
  await revalidate(parsed.data.committee_id);
  return ok(undefined, "Document shared with the committee.");
}

export async function updateResolutionLink(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { actor } = await getActor();
  if (!uuid.safeParse(id).success) return fail("Invalid document.");
  const parsed = resolutionLinkSchema.safeParse(input(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data: existing } = await supabase.from("resolution_links").select("profile_id, committee_id").eq("id", id).maybeSingle();
  if (!existing) return fail("Document not found.");
  if (!canManageResolution(actor, existing)) return fail("You can only edit your own documents.");
  const { committee_id: _ignored, ...patch } = parsed.data;
  void _ignored;
  const { error } = await supabase.from("resolution_links").update(patch).eq("id", id);
  if (error) return fail(describeDbError(error));
  await revalidate(existing.committee_id);
  return ok(undefined, "Document updated.");
}

export async function deleteResolutionLink(id: string): Promise<ActionResult> {
  const { actor } = await getActor();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("resolution_links").select("profile_id, committee_id").eq("id", id).maybeSingle();
  if (!existing) return fail("Document not found.");
  if (!canManageResolution(actor, existing)) return fail("You can only remove your own documents.");
  const { error } = await supabase.from("resolution_links").delete().eq("id", id);
  if (error) return fail(describeDbError(error));
  await revalidate(existing.committee_id);
  return ok(undefined, "Document removed.");
}
