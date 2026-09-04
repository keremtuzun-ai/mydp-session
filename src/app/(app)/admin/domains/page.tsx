import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAllowedSchoolDomains } from "@/lib/env";
import { DomainsManager } from "./domains-manager";

export const metadata: Metadata = { title: "Admin · School domains" };

export default async function AdminDomainsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("allowed_email_domains").select("*").order("domain");
  return <DomainsManager dbDomains={(data ?? []).map((d) => d.domain)} envDomains={getAllowedSchoolDomains()} />;
}
