"use client";

import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { deleteCommittee } from "@/actions/committees";

export function DeleteCommitteeButton({ id, acronym }: { id: string; acronym: string }) {
  return (
    <ActionButton size="icon" variant="ghost" aria-label={`Delete ${acronym}`} action={() => deleteCommittee(id)} confirm={{ title: `Delete ${acronym}?`, description: "Memberships, session blocks and committee materials are removed. Tasks lose their committee link.", confirmLabel: "Delete committee" }}>
      <Trash2 className="size-4" aria-hidden />
    </ActionButton>
  );
}
