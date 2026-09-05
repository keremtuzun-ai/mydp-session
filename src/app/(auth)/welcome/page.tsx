import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { SignUpForm } from "./welcome-form";

export const metadata: Metadata = { title: "Create account" };

export default async function WelcomePage() {
  return (
    <AuthCard eyebrow="First time here?" title="Create your account" description="An email and a password.">
      <SignUpForm />
      <p className="mt-6 small muted">
        Already have an account?{" "}
        <Link href="/login" className="prose-link">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
