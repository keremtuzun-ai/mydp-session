import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { ResetRequestForm } from "./reset-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <AuthCard eyebrow="Account recovery" title="Reset your password" description="Enter your school email. We will send a reset link and a code.">
      <ResetRequestForm />
      <p className="mt-6 small muted">
        <Link href="/login" className="prose-link">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
