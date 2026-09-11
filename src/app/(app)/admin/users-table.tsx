"use client";

import { useActionState, useState } from "react";
import { Trash2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { RoleBadge } from "@/components/mun/role-badge";
import { UserChip } from "@/components/mun/user-chip";
import { setUserRole, deleteUser } from "@/actions/admin";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { USER_ROLES, ROLE_LABEL } from "@/lib/auth/roles";
import { formatAccessCode, isMemberEmail, isMemberTier, MEMBER_TIERS, TIER_LABEL } from "@/lib/auth/access-code";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";
import { CopyCodeButton } from "./create-member-form";

type Row = Profile;

function RoleSelect({ profileId, role, tier, disabled }: { profileId: string; role: Profile["role"]; tier: string | null; disabled: boolean }) {
  const [state, action] = useActionState(setUserRole, null);
  useActionFeedback(state);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-1">
      <input type="hidden" name="profile_id" value={profileId} />
      <NativeSelect name="tier" defaultValue={isMemberTier(tier) ? tier : ""} disabled={disabled} aria-label="Junior or senior" className="!py-1.5 !text-[0.8rem] w-28">
        <option value="">—</option>
        {MEMBER_TIERS.map((t) => (
          <option key={t} value={t}>
            {TIER_LABEL[t]}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect name="role" defaultValue={role} disabled={disabled} aria-label="Role" className="!py-1.5 !text-[0.8rem] w-32">
        {USER_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </NativeSelect>
      <SubmitButton size="sm" variant="ghost" disabled={disabled}>
        Save
      </SubmitButton>
    </form>
  );
}

export function UsersTable({ rows, codes, selfId }: { rows: Row[]; codes: Record<string, string>; selfId: string }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => `${r.display_name ?? ""} ${r.username ?? ""} ${codes[r.id] ?? ""} ${isMemberEmail(r.school_email) ? "" : r.school_email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 muted" aria-hidden />
          <Input className="pl-8" placeholder="Search name, username or code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        </div>
        <p className="m-0 label-caps">
          {rows.length} members · {rows.filter((r) => r.tier === "senior").length} seniors · {rows.filter((r) => r.tier === "junior").length} juniors
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Access code</TableHead>
            <TableHead>Member · role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const code = codes[r.id];
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <UserChip name={r.display_name ?? "(not onboarded)"} username={r.username} avatarUrl={r.avatar_url} />
                  {isMemberEmail(r.school_email) ? null : <span className="block muted text-xs mt-1">{r.school_email}</span>}
                  {r.phone ? <span className="block muted text-xs">{r.phone}</span> : null}
                </TableCell>
                <TableCell>
                  {code ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="code-pill">{formatAccessCode(code)}</span>
                      <CopyCodeButton code={code} label={`Copy ${r.display_name ?? "member"}'s access code`} />
                    </span>
                  ) : (
                    <span className="muted small">{r.username === "executive" ? "Secret link" : "None issued"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      {isMemberTier(r.tier) ? <Badge variant="secondary">{TIER_LABEL[r.tier]}</Badge> : null}
                      <RoleBadge role={r.role} />
                    </div>
                    <RoleSelect profileId={r.id} role={r.role} tier={r.tier} disabled={r.id === selfId} />
                  </div>
                </TableCell>
                <TableCell className="muted">
                  {formatDate(r.created_at)}
                  {!r.onboarding_completed_at ? <Badge variant="warning" dot className="ml-1">Pending</Badge> : null}
                </TableCell>
                <TableCell className="text-right">
                  <ActionButton
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${r.display_name ?? r.username ?? "member"}`}
                    disabled={r.id === selfId}
                    action={() => deleteUser(r.id)}
                    confirm={{ title: `Remove ${r.display_name ?? r.username ?? "this member"}?`, description: "Their account, access code, memberships, uploads and attendance are deleted permanently. Create a new account to issue a new code.", confirmLabel: "Remove member" }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </ActionButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
