import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { WelcomeForm } from "./welcome-form";
import { getAllowedSchoolDomains } from "@/lib/env";

export const metadata: Metadata = { title: "First-time setup" };

export default function WelcomePage() {
  const domains = getAllowedSchoolDomains();
  return (
    <AuthCard
      eyebrow="First time here?"
      title="Verify your school email"
      description="Accounts are created only for verified school addresses. Enter yours and we will send a one-time code."
    >
      <WelcomeForm />
      {domains.length ? (
        <p className="mt-4 small muted mono">Accepted domains: {domains.map((d) => `@${d}`).join(", ")}</p>
      ) : (
        <p className="mt-4 small text-destructive">No school domains are configured. Set ALLOWED_SCHOOL_DOMAINS.</p>
      )}
      <p className="mt-6 small muted">
        Already have an account?{" "}
        <Link href="/login" className="prose-link">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
