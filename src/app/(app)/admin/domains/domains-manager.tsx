"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { addAllowedDomain, removeAllowedDomain } from "@/actions/admin";
import { useActionFeedback } from "@/hooks/use-action-feedback";

export function DomainsManager({ dbDomains, envDomains }: { dbDomains: string[]; envDomains: string[] }) {
  const [state, action] = useActionState(addAllowedDomain, null);
  useActionFeedback(state);
  const all = Array.from(new Set([...dbDomains, ...envDomains])).sort();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Two lists must agree. <strong>Environment</strong> (ALLOWED_SCHOOL_DOMAINS) is checked by the app before any code is sent.{" "}
          <strong>Database</strong> is enforced by a trigger when an account is created, even if someone calls the auth API directly.
        </p>
        <ul className="divide-y rounded-lg border bg-card">
          {all.map((d) => (
            <li key={d} className="flex items-center justify-between gap-3 p-3">
              <span className="font-mono text-sm">@{d}</span>
              <div className="flex items-center gap-2">
                <Badge variant={envDomains.includes(d) ? "success" : "warning"}>{envDomains.includes(d) ? "env" : "not in env"}</Badge>
                <Badge variant={dbDomains.includes(d) ? "success" : "warning"}>{dbDomains.includes(d) ? "db" : "not in db"}</Badge>
                {dbDomains.includes(d) ? (
                  <ActionButton size="icon" variant="ghost" aria-label={`Remove ${d} from database`} action={() => removeAllowedDomain(d)} confirm={{ title: `Remove @${d}?`, description: "New accounts from this domain will be refused by the database. Existing accounts keep working.", confirmLabel: "Remove" }}>
                    <Trash2 className="size-4" aria-hidden />
                  </ActionButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Card className="p-4">
        <form action={action} className="space-y-3">
          <p className="text-sm font-medium">Add a domain to the database list</p>
          <Field label="Domain" htmlFor="domain" hint="Lowercase, without @. Subdomains are separate entries.">
            <Input id="domain" name="domain" placeholder="stu.school.edu" required />
          </Field>
          <FormError message={state && !state.ok ? state.error : null} />
          <div className="flex justify-end">
            <SubmitButton size="sm">Add domain</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
