/**
 * Creates delegate accounts from the command line, with exactly the same
 * result as the desk's "Create an account" form: a complete profile (no
 * onboarding) and one immutable 12-character access code.
 *
 *   npm run members:create -- "Ela Tunç:junior" "İnci İyigün:junior"
 *
 * The tier defaults to junior. Re-running with a name that already exists
 * prints that member's existing code instead of creating a second account.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/types/database";
import { generateAccessCode, formatAccessCode, memberEmailForCode, usernameFromName, isMemberTier } from "../src/lib/auth/access-code";
import { usernameSchema } from "../src/lib/auth/username";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/** "Beren Yasemin Aydıner" → first name "Beren Yasemin", surname "Aydıner". */
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) throw new Error(`"${full}" needs a name and a surname`);
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts.at(-1)! };
}

async function unusedCode() {
  for (let i = 0; i < 20; i++) {
    const code = generateAccessCode();
    const { data } = await admin.from("access_codes").select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not find an unused access code");
}

async function unusedUsername(firstName: string, lastName: string) {
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

async function createMember(fullName: string, tier: string) {
  const { first_name, last_name } = splitName(fullName);
  const displayName = `${first_name} ${last_name}`;
  if (!isMemberTier(tier)) throw new Error(`"${tier}" is not a tier: use junior or senior`);

  const { data: existing } = await admin.from("profiles").select("id, username").eq("display_name", displayName).maybeSingle();
  if (existing) {
    const { data: code } = await admin.from("access_codes").select("code").eq("profile_id", existing.id).maybeSingle();
    console.log(`= ${displayName.padEnd(24)} ${String(existing.username).padEnd(24)} ${code ? formatAccessCode(code.code) : "(no code)"}  already existed`);
    return;
  }

  const [code, username] = await Promise.all([unusedCode(), unusedUsername(first_name, last_name)]);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: memberEmailForCode(code),
    email_confirm: true,
    user_metadata: { created_by_desk: true, display_name: displayName },
  });
  if (createError || !created.user) throw createError ?? new Error(`Could not create ${displayName}`);
  const id = created.user.id;

  // The auth trigger inserts the profile row; the service role completes it.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_name, last_name, display_name: displayName, username, tier, role: "delegate", onboarding_completed_at: new Date().toISOString() })
    .eq("id", id);
  const { error: codeError } = profileError ? { error: null } : await admin.from("access_codes").insert({ code, profile_id: id });
  if (profileError || codeError) {
    await admin.auth.admin.deleteUser(id);
    throw profileError ?? codeError;
  }
  console.log(`+ ${displayName.padEnd(24)} ${username.padEnd(24)} ${formatAccessCode(code)}  ${tier}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) throw new Error('Pass one or more "Full Name[:tier]" arguments');
  for (const arg of args) {
    const [name, tier = "junior"] = arg.split(":");
    await createMember(name!, tier);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
