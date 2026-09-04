import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "../auth-card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Enter your code" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  const flow = sp.flow === "setup" ? "setup" : "login";
  if (!email) redirect(flow === "setup" ? "/welcome" : "/login");
  return (
    <AuthCard
      eyebrow={flow === "setup" ? "First-time setup · step 1 of 2" : "Check your inbox"}
      title="Check your email"
      description={`We sent an email to ${email}. Open the link in it on any device to continue${flow === "setup" ? " to choosing your username and password" : ""}. If the email also shows a 6-digit code, you can enter it here instead.`}
    >
      <VerifyForm email={email} flow={flow} />
    </AuthCard>
  );
}
