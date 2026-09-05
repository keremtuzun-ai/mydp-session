"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { execAccountEmail, getExecInviteToken, getExecSharedPassword } from "@/lib/env";
import { fail, type ActionResult } from "@/lib/action-result";
import { logAudit } from "@/lib/audit";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Constant-time check of the secret path segment against EXEC_INVITE_TOKEN. */
export async function isValidExecInviteToken(candidate: string | undefined): Promise<boolean> {
  const expected = getExecInviteToken();
  return Boolean(expected && candidate && same(candidate, expected));
}

/**
 * Secret executive link: the whole Secretariat shares one account. Whoever
 * opens /exec-invite/<token> and enters the executive password is signed in
 * to that account and sent to the desk. Executives type their own name on
 * every task or announcement they publish.
 */
export async function signInExecutive(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = formData.get("token");
  if (typeof token !== "string" || !(await isValidExecInviteToken(token))) return fail("This link is not valid any more.");
  const password = formData.get("password");
  const expected = getExecSharedPassword();
  if (!expected) return fail("The executive password is not configured. Ask the admin.");
  if (typeof password !== "string" || !same(password, expected)) return fail("Incorrect executive password.");

  const email = execAccountEmail();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: expected });
  if (error || !data.user) return fail("The shared executive account is not set up yet. Ask the admin to run the account script.");
  await logAudit({ actorId: data.user.id, action: "exec.shared_signin", entityType: "profile", entityId: data.user.id });
  redirect("/exec");
}
