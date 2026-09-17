import { describe, expect, it } from "vitest";
import { isTallyKind, parseCountries, tallyCountries } from "@/lib/tally";

describe("tally", () => {
  it("splits typed countries on commas, semicolons and new lines, deduplicated", () => {
    expect(parseCountries("France, germany\nJapan; france ,, N/A")).toEqual(["France", "Germany", "Japan"]);
    expect(parseCountries("")).toEqual([]);
  });
  it("lists the typed countries first, then other delegations that submitted", () => {
    expect(tallyCountries(["France", "Japan"], ["japan", "Brazil", "N/A", null])).toEqual([
      { key: "france", country: "France" },
      { key: "japan", country: "Japan" },
      { key: "brazil", country: "Brazil" },
    ]);
  });
  it("knows the three counters", () => {
    expect(isTallyKind("pois")).toBe(true);
    expect(isTallyKind("votes")).toBe(false);
  });
});
