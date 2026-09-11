"use client";

import { useRouter } from "next/navigation";
import { useLiveChannel } from "@/hooks/use-live-channel";

/** Re-renders the server page whenever the given topic is broadcast (no user-visible output). */
export function LiveRefresh({ topic, pollMs }: { topic: string; pollMs?: number }) {
  const router = useRouter();
  useLiveChannel(topic, () => router.refresh(), { pollMs });
  return null;
}
