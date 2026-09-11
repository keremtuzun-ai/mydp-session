import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_EVENT } from "@/lib/realtime/topics";

/**
 * Tells every open browser on a topic that something changed. Sent over
 * Supabase Realtime's HTTP broadcast endpoint (no socket on the server), on a
 * public channel: the message carries no data, listeners refetch through
 * their own RLS-checked reads. Failures are logged and never block the action.
 */
export async function broadcast(topic: string) {
  try {
    const admin = createAdminClient();
    const channel = admin.channel(topic, { config: { private: false } });
    const payload = { at: Date.now() };
    try {
      await channel.httpSend(LIVE_EVENT, payload);
    } catch (err) {
      // Older Realtime servers lack the httpSend endpoint; send() falls back to the legacy REST route.
      console.warn("[realtime] httpSend failed, using legacy send", topic, err instanceof Error ? err.message : err);
      const result = await channel.send({ type: "broadcast", event: LIVE_EVENT, payload });
      if (result !== "ok") console.error("[realtime] broadcast failed", topic, result);
    }
  } catch (err) {
    console.error("[realtime] broadcast unavailable", topic, err);
  }
}
