/** Broadcast topics shared by the server (sender) and the browser (listener). */

/** Anything about which resolutions are shared or whether a round is open or closed. */
export const RESOLUTIONS_TOPIC = "resolutions";

/** One resolution's voting round: opened, closed, cleared, or a vote cast. */
export function votingTopic(delegationKey: string) {
  return `voting:${delegationKey}`;
}

/** The single event name; listeners refetch on it, the payload carries nothing sensitive. */
export const LIVE_EVENT = "changed";

/** The exec desk's speech tally for one task: a count changed. */
export function tallyTopic(taskId: string) {
  return `tally:${taskId}`;
}
