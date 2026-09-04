import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { LoginForms } from "./login-forms";
import { FormError, FormSuccess } from "@/components/ui/field";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Request a new code.",
  domain: "That email is not from an approved school domain.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  const signedOut = sp.signedout === "1";
  return (
    <AuthCard eyebrow="Welcome back" title="Sign in" description="Use your username and password, or request a one-time code at your school email.">
      <div className="flex flex-col gap-2 mb-4">
        <FormError message={error} />
        <FormSuccess message={signedOut ? "You have been signed out." : null} />
      </div>
      <LoginForms next={next} />
      <p className="mt-6 small muted">
        First time here?{" "}
        <Link href="/welcome" className="prose-link">
          Set up your account
        </Link>
      </p>
    </AuthCard>
  );
}
