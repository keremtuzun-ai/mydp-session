import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../../auth-card";
import { NewPasswordForm } from "../reset-forms";
import { getAuthState } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function UpdatePasswordPage() {
  const { user } = await getAuthState();
  if (!user) {
    return (
      <AuthCard title="Link expired" description="Your reset link is no longer valid. Request a new one to continue.">
        <Button asChild>
          <Link href="/reset-password">Request a new link</Link>
        </Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard eyebrow={user.email ?? undefined} title="Choose a new password">
      <NewPasswordForm />
    </AuthCard>
  );
}
