import { describe, it, expect } from "vitest";
import { BOARD_TITLES, boardTitle } from "@/lib/board";
import { usernameFromName } from "@/lib/auth/access-code";

describe("board titles", () => {
  it("names the 2026-27 board", () => {
    expect(boardTitle("ela-tunc")).toBe("Ms. President");
    expect(boardTitle("inci-iyigun")).toBe("Ms. Secretary");
    expect(boardTitle("beren-yasemin-aydiner")).toBe("Ms. Vice President");
  });

  it("gives every other member no title", () => {
    expect(boardTitle("keremtuzun")).toBeNull();
    expect(boardTitle(null)).toBeNull();
    expect(boardTitle(undefined)).toBeNull();
    expect(boardTitle("")).toBeNull();
  });

  // The keys have to be the usernames the desk actually generates, Turkish
  // letters folded to ASCII, or the title never reaches the screen.
  it("keys match the usernames generated from the members' names", () => {
    expect(usernameFromName("Ela", "Tunç")).toBe("ela-tunc");
    expect(usernameFromName("İnci", "İyigün")).toBe("inci-iyigun");
    expect(usernameFromName("Beren Yasemin", "Aydıner")).toBe("beren-yasemin-aydiner");
    expect(Object.keys(BOARD_TITLES).sort()).toEqual(["beren-yasemin-aydiner", "ela-tunc", "inci-iyigun"]);
  });
});
