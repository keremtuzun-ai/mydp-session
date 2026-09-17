/**
 * The club board for 2026-27. The title is shown under the member's name
 * wherever members are listed; it is a label only and grants nothing, so it
 * lives here next to the senior roster rather than in the database.
 */
export const BOARD_TITLES: Record<string, string> = {
  "ela-tunc": "Ms. President",
  "inci-iyigun": "Ms. Secretary",
  "beren-yasemin-aydiner": "Ms. Vice President",
};

/** The board title for a member, by username, or null for everyone else. */
export function boardTitle(username: string | null | undefined): string | null {
  return (username && BOARD_TITLES[username]) || null;
}
