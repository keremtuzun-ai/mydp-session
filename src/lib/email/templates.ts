import "server-only";
import { appName, siteUrl } from "@/lib/env";

export type EmailKind = "signup" | "magiclink" | "recovery" | "email_change" | "invite" | "reauthentication" | "email_change_current";

type Copy = { subject: string; kicker: string; heading: string; lede: string; button: string; after: string; codeLabel: string | null };

const COPY: Record<EmailKind, Copy> = {
  magiclink: {
    subject: "Your MUNDP sign-in code",
    kicker: "Weekly sessions",
    heading: "Your sign-in code",
    lede: "Use the code below on the page where you requested it, or open the button on any device. Either one signs you in.",
    button: `Open ${appName}`,
    after: "First time here? The link takes you straight to choosing your username and password.",
    codeLabel: `Enter this code in ${appName}`,
  },
  signup: {
    subject: "Confirm your school email · MUNDP",
    kicker: "Welcome to MUNDP",
    heading: "Confirm your school email",
    lede: "Thanks for joining the weekly sessions. Confirm this address to set up your delegate account.",
    button: "Confirm and continue",
    after: "After confirming you will choose a username and password for everyday sign-in.",
    codeLabel: "Your verification code",
  },
  recovery: {
    subject: "Reset your MUNDP password",
    kicker: "Account recovery",
    heading: "Reset your password",
    lede: "Someone asked to reset the password for this school email. Use the code on the reset page, or open the button to choose a new password.",
    button: "Choose a new password",
    after: "Changing your password signs out every other device.",
    codeLabel: "Your recovery code",
  },
  email_change: {
    subject: "Confirm your new email · MUNDP",
    kicker: "Account",
    heading: "Confirm your new email address",
    lede: `Confirm that this is the address you want ${appName} to use from now on.`,
    button: "Confirm new email",
    after: "Your username and password do not change.",
    codeLabel: "Your confirmation code",
  },
  email_change_current: {
    subject: "Your MUNDP email is changing",
    kicker: "Account",
    heading: "Approve the email change",
    lede: "A request was made to move your account to a new email address. Confirm from this address to allow it.",
    button: "Approve the change",
    after: "If this was not you, sign in and change your password.",
    codeLabel: "Your confirmation code",
  },
  invite: {
    subject: "You are invited to MUNDP",
    kicker: "Invitation",
    heading: "You have been invited",
    lede: `The Secretariat has invited you to ${appName}, the home of the weekly Model United Nations sessions.`,
    button: "Accept the invitation",
    after: "You will choose a username and password after accepting.",
    codeLabel: null,
  },
  reauthentication: {
    subject: "Your MUNDP confirmation code",
    kicker: "Security check",
    heading: "Confirm it is you",
    lede: "Enter this code to confirm the sensitive change you are making.",
    button: `Open ${appName}`,
    after: "The code works once.",
    codeLabel: "Your confirmation code",
  },
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Branded MUNDP email: paper background, logo, bronze kicker, code block, navy button. */
export function renderEmail(kind: EmailKind, opts: { token: string | null; actionUrl: string | null }) {
  const c = COPY[kind] ?? COPY.magiclink;
  const logo = `${siteUrl}/img/mundp-2027-logo-email.png`;
  const code =
    c.codeLabel && opts.token
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>
      <td style="background:#f6f4ee;border:1px solid rgba(23,23,28,0.16);border-radius:7px;padding:14px 22px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:#4e4f58;">${esc(c.codeLabel)}</p>
        <p style="margin:0;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:30px;letter-spacing:0.28em;font-weight:700;color:#07054d;">${esc(opts.token)}</p>
      </td></tr></table>`
      : "";
  const button = opts.actionUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr>
      <td style="background:#07054d;border-radius:7px;">
        <a href="${esc(opts.actionUrl)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;color:#f6f4ee;text-decoration:none;">${esc(c.button)}</a>
      </td></tr></table>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f4ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17171c;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ee;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="padding:0 0 18px 0;"><img src="${logo}" width="200" alt="MUNDP 2027 — Commitment to Development" style="display:block;height:auto;border:0;"></td></tr>
  <tr><td style="border-top:3px solid #17171c;"></td></tr>
  <tr><td style="background:#fffefa;border:1px solid rgba(23,23,28,0.16);border-top:0;border-radius:0 0 10px 10px;padding:30px 32px 26px;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:#4e4f58;"><span style="display:inline-block;width:22px;height:3px;background:#8a6d2c;vertical-align:middle;margin-right:10px;"></span>${esc(c.kicker)}</p>
    <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;letter-spacing:-0.015em;font-weight:700;color:#17171c;">${esc(c.heading)}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4e4f58;">${esc(c.lede)}</p>
    ${code}${button}
    <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#4e4f58;">${esc(c.after)}</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#85868f;">If you did not request this, you can ignore this email. The link and code expire in one hour and work once.</p>
  </td></tr>
  <tr><td style="padding:18px 4px 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#85868f;">${esc(appName)} · Model United Nations Development Programme · <a href="${esc(siteUrl)}" style="color:#85868f;">${esc(siteUrl.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [c.heading, "", c.lede, "", opts.token && c.codeLabel ? `${c.codeLabel}: ${opts.token}` : null, opts.actionUrl ? `${c.button}: ${opts.actionUrl}` : null, "", c.after].filter((l) => l !== null).join("\n");
  return { subject: c.subject, html, text };
}
