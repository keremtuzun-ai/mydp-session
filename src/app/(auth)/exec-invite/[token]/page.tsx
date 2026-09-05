import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthCard } from "../../auth-card";
import { ExecInviteForm } from "./invite-form";
import { isValidExecInviteToken } from "@/actions/exec-invite";

export const metadata: Metadata = { title: "Executive invite" };

export default async function ExecInvitePage({ params }: PageProps<"/exec-invite/[token]">) {
  const { token } = await params;
  if (!(await isValidExecInviteToken(token))) notFound();
  return (
    <AuthCard eyebrow="Secretariat invite" title="Join the executive team" description="Enter your school email. It is added to the executive list, and you then sign in (or create your account) to open the executive desk: assign tasks, follow progress, review submissions and take attendance.">
      <ExecInviteForm token={token} />
    </AuthCard>
  );
}
