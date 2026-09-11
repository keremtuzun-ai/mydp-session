import type { Metadata } from "next";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-forms";
import { FormSuccess } from "@/components/ui/field";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";
  const signedOut = sp.signedout === "1";
  return (
    <AuthCard eyebrow="Welcome back" title="Sign in" description="Enter the access code the Secretariat gave you.">
      <div className="flex flex-col gap-2 mb-4">
        <FormSuccess message={signedOut ? "You have been signed out." : null} />
      </div>
      <LoginForm next={next} />
      <p className="mt-6 small muted">No code yet? Ask an executive: accounts are created by the Secretariat, and every member gets one code that never changes.</p>
    </AuthCard>
  );
}
