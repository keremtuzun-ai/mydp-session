"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActor } from "@/lib/auth/actor";
import { isStaff } from "@/lib/policy";
import { namePartSchema } from "@/lib/validation/schemas";
import { usernameSchema } from "@/lib/auth/username";
import { MEMBER_TIERS, generateAccessCode, memberEmailForCode, usernameFromName, type MemberTier } from "@/lib/auth/access-code";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { describeDbError } from "@/lib/db-errors";
import { logAudit } from "@/lib/audit";

const newMemberSchema = z.object({
  first_name: namePartSchema("name"),
  last_name: namePartSchema("surname"),
  tier: z.enum(MEMBER_TIERS, { message: "Choose junior or senior" }),
});

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[String(i.path[0] ?? "form")] ??= []).push(i.message);
  return out;
}

type Admin = ReturnType<typeof createAdminClient>;

async function unusedCode(admin: Admin) {
  for (let i = 0; i < 20; i++) {
    const code = generateAccessCode();
    const { data } = await admin.from("access_codes").select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not find an unused access code");
}

async function unusedUsername(admin: Admin, firstName: string, lastName: string) {
  const base = usernameFromName(firstName, lastName);
  for (let n = 1; n < 100; n++) {
    const suffix = n === 1 ? "" : `-${n}`;
    const candidate = `${base.slice(0, 24 - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!usernameSchema.safeParse(candidate).success) continue;
    const { data } = await admin.from("profiles").select("id").eq("username", candidate).maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Could not find a free username");
}

export type NewMember = { id: string; name: string; code: string; tier: MemberTier; username: string };

/**
 * The executive desk creates a member: name, surname, junior or senior. The
 * account is created already complete (no onboarding), and its 12-character
 * access code is generated once and returned so the desk can hand it over.
 */
export async function createMemberAccount(_prev: ActionResult<NewMember> | null, formData: FormData): Promise<ActionResult<NewMember>> {
  const { actor } = await getActor();
  if (!isStaff(actor)) return fail("Only the executive desk can create accounts.");
  const parsed = newMemberSchema.safeParse({ first_name: formData.get("first_name"), last_name: formData.get("last_name"), tier: formData.get("tier") });
  if (!parsed.success) return fail("Check the highlighted fields.", fieldErrors(parsed.error.issues));
  const { first_name, last_name, tier } = parsed.data;
  const displayName = `${first_name} ${last_name}`;

  const admin = createAdminClient();
  let code: string;
  let username: string;
  try {
    [code, username] = await Promise.all([unusedCode(admin), unusedUsername(admin, first_name, last_name)]);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not prepare the account.");
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: memberEmailForCode(code),
    email_confirm: true,
    user_metadata: { created_by_desk: true, display_name: displayName },
  });
  if (createError || !created.user) return fail(createError?.message ?? "Could not create the account.");
  const id = created.user.id;

  // The auth trigger inserts the profile row; the service role completes it (no grade: the desk does not ask for one).
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_name, last_name, display_name: displayName, username, tier, role: "delegate", onboarding_completed_at: new Date().toISOString() })
    .eq("id", id);
  const { error: codeError } = profileError ? { error: null } : await admin.from("access_codes").insert({ code, profile_id: id, created_by: actor.id });
  if (profileError || codeError) {
    await admin.auth.admin.deleteUser(id);
    return fail(describeDbError((profileError ?? codeError)!));
  }

  await logAudit({ actorId: actor.id, action: "member.created", entityType: "profile", entityId: id, metadata: { name: displayName, tier, username } });
  revalidatePath("/admin", "layout");
  return ok({ id, name: displayName, code, tier, username }, `Account created for ${displayName}.`);
}
