import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { SignUpForm } from "./welcome-form";
import { getAllowedSchoolDomains } from "@/lib/env";

export const metadata: Metadata = { title: "Create account" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const sp = await searchParams;
  const domains = getAllowedSchoolDomains();
  return (
    <AuthCard eyebrow="First time here?" title="Create your account" description="Use your school email and choose a password. You will use both every time you open the site.">
      {sp.error === "domain" ? <div role="alert" className="flash flash-error mb-4">That email is not from an approved school domain.</div> : null}
      <SignUpForm />
      {domains.length ? <p className="mt-4 small muted mono">Accepted domains: {domains.map((d) => `@${d}`).join(", ")}</p> : <p className="mt-4 small text-destructive">No school domains are configured. Set ALLOWED_SCHOOL_DOMAINS.</p>}
      <p className="mt-6 small muted">
        Already have an account?{" "}
        <Link href="/login" className="prose-link">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
