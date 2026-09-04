import "server-only";
import { getViewer, type Viewer } from "@/lib/auth/session";
import type { Actor } from "@/lib/policy";

export function toActor(v: Viewer): Actor {
  return {
    id: v.userId,
    role: v.role,
    chairedCommitteeIds: v.chairedCommitteeIds,
    memberCommitteeIds: v.memberCommitteeIds,
  };
}

export async function getActor() {
  const viewer = await getViewer();
  return { viewer, actor: toActor(viewer) };
}
