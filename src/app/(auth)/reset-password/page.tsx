import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";

export const metadata: Metadata = { title: "Forgot password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Account recovery" title="Forgot your password?" description="Ask an executive for a temporary password, then change it in Settings.">
      <p className="mt-2 small muted">
        <Link href="/login" className="prose-link">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
