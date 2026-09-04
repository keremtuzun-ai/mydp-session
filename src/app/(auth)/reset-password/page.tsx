import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";

export const metadata: Metadata = { title: "Forgot password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Account recovery" title="Forgot your password?" description="Passwords are reset by the Secretariat: ask an executive or admin in person or on the programme chat. They will give you a temporary password to sign in with, and you can change it in Settings.">
      <p className="mt-2 small muted">
        <Link href="/login" className="prose-link">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
