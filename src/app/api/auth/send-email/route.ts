import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { renderEmail, type EmailKind } from "@/lib/email/templates";
import { sendWithResend } from "@/lib/email/resend";

/**
 * Supabase Auth "Send Email" hook. Supabase calls this instead of its own
 * mailer, so the built-in hourly quota no longer applies and every message is
 * the branded MUNDP template with both a code and a link. Requests are
 * verified with the Standard Webhooks signature Supabase attaches.
 */
export const runtime = "nodejs";

type HookPayload = {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailKind;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

function verify(request: NextRequest, body: string): boolean {
  const secretRaw = process.env.SEND_EMAIL_HOOK_SECRET ?? "";
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signatures = request.headers.get("webhook-signature");
  if (!secretRaw || !id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  // Supabase shows the secret as "v1,whsec_<base64>"; Standard Webhooks signs with the decoded bytes.
  const secrets = secretRaw.split(/\s+/).map((s) => s.replace(/^v1,/, "").replace(/^whsec_/, ""));
  const toSign = `${id}.${timestamp}.${body}`;
  return signatures.split(/\s+/).some((entry) => {
    const [version, sig] = entry.split(",");
    if (version !== "v1" || !sig) return false;
    return secrets.some((secret) => {
      const expected = createHmac("sha256", Buffer.from(secret, "base64")).update(toSign).digest();
      const given = Buffer.from(sig, "base64");
      return expected.length === given.length && timingSafeEqual(expected, given);
    });
  });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  if (!verify(request, body)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: HookPayload;
  try {
    payload = JSON.parse(body) as HookPayload;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const { user, email_data: d } = payload;
  if (!user?.email || !d) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const verifyUrl = (tokenHash: string, type: string) =>
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url)}`;

  const kind = d.email_action_type;
  const actionUrl = kind === "reauthentication" ? null : verifyUrl(d.token_hash, kind === "email_change_current" ? "email_change" : kind);
  const mail = renderEmail(kind, { token: d.token, actionUrl });

  try {
    await sendWithResend({ to: user.email, ...mail });
    return NextResponse.json({});
  } catch (err) {
    console.error("[send-email hook]", err);
    return NextResponse.json({ error: { http_code: 500, message: err instanceof Error ? err.message : "send failed" } }, { status: 500 });
  }
}
