import { describe, expect, it } from "vitest";
import { isVoteChoice, percent, voteOutcome } from "@/lib/voting";

describe("voting", () => {
  it("accepts only the three choices", () => {
    expect(isVoteChoice("favour")).toBe(true);
    expect(isVoteChoice("abstain")).toBe(true);
    expect(isVoteChoice("yes")).toBe(false);
    expect(isVoteChoice(null)).toBe(false);
  });
  it("decides the outcome by simple majority of votes cast, ignoring abstentions", () => {
    expect(voteOutcome({ favour: 5, against: 3, abstain: 9, total: 17 })).toBe("adopted");
    expect(voteOutcome({ favour: 2, against: 3, abstain: 0, total: 5 })).toBe("rejected");
    expect(voteOutcome({ favour: 3, against: 3, abstain: 1, total: 7 })).toBe("tied");
    expect(voteOutcome({ favour: 0, against: 0, abstain: 4, total: 4 })).toBe("no-votes");
  });
  it("renders bar widths safely when nobody has voted", () => {
    expect(percent(0, 0)).toBe(0);
    expect(percent(1, 4)).toBe(25);
  });
});
