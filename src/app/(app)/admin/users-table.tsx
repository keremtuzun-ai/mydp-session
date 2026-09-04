"use client";

import { useActionState, useState } from "react";
import { Trash2, Search, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, FormError } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ActionButton } from "@/components/forms/action-button";
import { RoleBadge } from "@/components/mun/role-badge";
import { UserChip } from "@/components/mun/user-chip";
import { setUserRole, deleteUser, setTemporaryPassword } from "@/actions/admin";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { upsertMembership } from "@/actions/committees";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { USER_ROLES, ROLE_LABEL } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

type Row = Profile & { committees: string[] };

function RoleSelect({ profileId, role, disabled }: { profileId: string; role: Profile["role"]; disabled: boolean }) {
  const [state, action] = useActionState(setUserRole, null);
  useActionFeedback(state);
  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="profile_id" value={profileId} />
      <NativeSelect name="role" defaultValue={role} disabled={disabled} aria-label="Role" className="!py-1.5 !text-[0.8rem] w-36">
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

export function UsersTable({ rows, selfId, committees }: { rows: Row[]; selfId: string; committees: { id: string; acronym: string }[] }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => `${r.display_name ?? ""} ${r.username ?? ""} ${r.school_email}`.toLowerCase().includes(q.toLowerCase()));
  const [assignState, assignAction] = useActionState(upsertMembership, null);
  useActionFeedback(assignState);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 muted" aria-hidden />
          <Input className="pl-8" placeholder="Search name, username or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        </div>
        <p className="m-0 label-caps">
          {rows.length} members · {rows.filter((r) => !r.onboarding_completed_at).length} pending onboarding
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>School email</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Committees</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <UserChip name={r.display_name ?? "(not onboarded)"} username={r.username} avatarUrl={r.avatar_url} />
              </TableCell>
              <TableCell className="muted">
                {r.school_email}
                {r.phone ? <span className="block text-xs">{r.phone}</span> : null}
              </TableCell>
              <TableCell>{r.grade ?? "—"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {r.committees.length ? r.committees.map((c) => <Badge key={c} variant="navy">{c}</Badge>) : <span className="muted">—</span>}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <RoleBadge role={r.role} />
                  <RoleSelect profileId={r.id} role={r.role} disabled={r.id === selfId} />
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
                  aria-label={`Set a temporary password for ${r.display_name ?? r.school_email}`}
                  action={async () => {
                    const result = await setTemporaryPassword(r.id);
                    if (result.ok) {
                      toast.message(`Temporary password for ${r.display_name ?? r.school_email}`, { description: result.data.password, duration: 60000 });
                      window.prompt("Temporary password (copy it now; it is not shown again):", result.data.password);
                    }
                    return result;
                  }}
                  confirm={{ title: `Reset ${r.display_name ?? r.school_email}'s password?`, description: "A temporary password is generated and shown to you once. Their current password stops working immediately.", confirmLabel: "Set temporary password", destructive: false }}
                >
                  <KeyRound className="size-4" aria-hidden />
                </ActionButton>
                <ActionButton
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${r.display_name ?? r.school_email}`}
                  disabled={r.id === selfId}
                  action={() => deleteUser(r.id)}
                  confirm={{ title: `Remove ${r.display_name ?? r.school_email}?`, description: "Their account, memberships, uploads and attendance are deleted permanently. They can re-register with their school email.", confirmLabel: "Remove member" }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </ActionButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Card className="card-tight">
        <form action={assignAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <span className="sm:col-span-4 section-label m-0">Assign a member to a committee</span>
          <Field label="Username" htmlFor="as-username">
            <Input id="as-username" name="username" placeholder="ayse-demir" required />
          </Field>
          <Field label="Committee" htmlFor="as-committee">
            <NativeSelect id="as-committee" name="committee_id" required>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.acronym}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Membership role" htmlFor="as-role">
            <NativeSelect id="as-role" name="membership_role" defaultValue="delegate">
              <option value="delegate">Delegate</option>
              <option value="co_chair">Co-Chair</option>
              <option value="chair">Chair</option>
              <option value="executive">Executive</option>
            </NativeSelect>
          </Field>
          <SubmitButton>
            <UserPlus className="size-4" aria-hidden /> Assign
          </SubmitButton>
          <FormError message={assignState && !assignState.ok ? assignState.error : null} />
        </form>
      </Card>
    </div>
  );
}
