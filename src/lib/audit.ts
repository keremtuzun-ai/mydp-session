import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/types/database";

/**
 * Writes an audit entry with the service-role client so the log survives even
 * when the actor's own permissions are being changed in the same request.
 * Failures are reported to the server log but never block the user action.
 */
export async function logAudit(input: { actorId: string; action: string; entityType: string; entityId?: string | null; metadata?: Json }) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) console.error("[audit] failed to write", input.action, error.message);
  } catch (err) {
    console.error("[audit] unavailable", err);
  }
}
