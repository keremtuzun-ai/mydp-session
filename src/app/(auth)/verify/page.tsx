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
      eyebrow={flow === "setup" ? "Step 1 of 2" : "Check your inbox"}
      title="Enter the 6-digit code"
      description={`We sent an email to ${email}. Enter the 6-digit code if the email contains one; if it contains a sign-in link instead, open that link in this browser and you will be brought straight through.`}
    >
      <VerifyForm email={email} flow={flow} />
    </AuthCard>
  );
}
