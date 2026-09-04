import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { WelcomeForm } from "./welcome-form";
import { getAllowedSchoolDomains } from "@/lib/env";

export const metadata: Metadata = { title: "First-time setup" };

const ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Request a new one below.",
  domain: "That email is not from an approved school domain.",
};

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const domains = getAllowedSchoolDomains();
  return (
    <AuthCard
      eyebrow="First time here?"
      title="Verify your school email"
      description="Accounts are created only for verified school addresses. Enter yours: we email you a verification link (and a code, where the school's mail template includes one). It opens straight into setting your username and password."
    >
      {error ? <div role="alert" className="flash flash-error mb-4">{error}</div> : null}
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
