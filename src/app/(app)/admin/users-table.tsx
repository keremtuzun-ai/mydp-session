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
import { setUserRole, deleteUser, setTemporaryPassword } from "@/actions/admin";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { USER_ROLES, ROLE_LABEL } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

type Row = Profile;

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

export function UsersTable({ rows, selfId }: { rows: Row[]; selfId: string }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => `${r.display_name ?? ""} ${r.username ?? ""} ${r.school_email}`.toLowerCase().includes(q.toLowerCase()));

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

    </div>
  );
}
