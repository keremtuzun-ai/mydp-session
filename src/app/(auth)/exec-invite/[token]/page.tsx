import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard } from "../../auth-card";
import { ExecPasswordForm } from "./invite-form";
import { isValidExecInviteToken } from "@/actions/exec-access";

export const metadata: Metadata = { title: "Executive desk" };

export default async function ExecInvitePage({ params }: PageProps<"/exec-invite/[token]">) {
  const { token } = await params;
  if (!(await isValidExecInviteToken(token))) notFound();
  return (
    <AuthCard eyebrow="Secretariat" title="Executive desk" description="Enter the executive password.">
      <ExecPasswordForm token={token} />
    </AuthCard>
  );
}
