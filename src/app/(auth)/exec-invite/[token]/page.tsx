import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AuthCard } from "../../auth-card";
import { ExecPasswordForm } from "./invite-form";
import { isValidExecInviteToken } from "@/actions/exec-access";
import { execOrigin } from "@/lib/env";

export const metadata: Metadata = { title: "Executive desk" };

export default async function ExecInvitePage({ params }: PageProps<"/exec-invite/[token]">) {
  const { token } = await params;
  if (!(await isValidExecInviteToken(token))) notFound();
  if (execOrigin) {
    const host = (await headers()).get("host") ?? "";
    if (host && host !== new URL(execOrigin).host && !host.startsWith("localhost")) redirect(`${execOrigin}/exec-invite/${token}`);
  }
  return (
    <AuthCard eyebrow="Secretariat" title="Executive desk" description="Enter the executive password.">
      <ExecPasswordForm token={token} />
    </AuthCard>
  );
}
