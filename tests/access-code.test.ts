import { describe, expect, it } from "vitest";
import { accessCodeSchema, formatAccessCode, generateAccessCode, isWellFormedAccessCode, normalizeAccessCode, usernameFromName, memberEmailForCode, isMemberEmail, ACCESS_CODE_ALPHABET } from "@/lib/auth/access-code";

describe("access codes", () => {
  it("normalises what members type: lower case, spaces and dashes", () => {
    expect(normalizeAccessCode(" abcd-efgh 1234 ")).toBe("ABCDEFGH1234");
    expect(accessCodeSchema.parse("abcd efgh 1234")).toBe("ABCDEFGH1234");
  });
  it("rejects the wrong length or characters", () => {
    expect(accessCodeSchema.safeParse("ABC").success).toBe(false);
    expect(accessCodeSchema.safeParse("ABCDEFGH12345").success).toBe(false);
    expect(accessCodeSchema.safeParse("").success).toBe(false);
  });
  it("generates 12 characters with at least one letter and one digit, from the alphabet only", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode();
      expect(code).toHaveLength(12);
      expect(isWellFormedAccessCode(code)).toBe(true);
      expect([...code].every((c) => ACCESS_CODE_ALPHABET.includes(c))).toBe(true);
      expect(code).not.toMatch(/[IO]/);
    }
  });
  it("retries when a draw has no digit or no letter", () => {
    let calls = 0;
    // First 12 draws are all letters, the next 12 mix letters and digits.
    const random = () => (calls++ < 12 ? 0 : calls % 2 === 0 ? 0 : 30);
    expect(isWellFormedAccessCode(generateAccessCode(random))).toBe(true);
    expect(calls).toBe(24);
  });
  it("formats in groups of four", () => {
    expect(formatAccessCode("ABCDEFGH1234")).toBe("ABCD-EFGH-1234");
  });
  it("derives the synthetic sign-in email and recognises it", () => {
    expect(memberEmailForCode("ABCDEFGH1234")).toBe("abcdefgh1234@members.example.com");
    expect(isMemberEmail("ABCDEFGH1234@members.example.com")).toBe(true);
    expect(isMemberEmail("kerem@stu.koc.k12.tr")).toBe(false);
  });
});

describe("usernameFromName", () => {
  it("folds Turkish letters and joins with hyphens", () => {
    expect(usernameFromName("Kerem", "Tüzün")).toBe("kerem-tuzun");
    expect(usernameFromName("Süleyman Tuğra", "Çolakoğlu")).toBe("suleyman-tugra-colakoglu");
    expect(usernameFromName("Işıl", "İnce")).toBe("isil-ince");
  });
  it("stays within the username rules", () => {
    expect(usernameFromName("Al", "")).toBe("al-member");
    expect(usernameFromName("Abcdefghijklmnopqrstuvwxyz", "Zzz")).toHaveLength(24);
    expect(usernameFromName("Abcdefghijklmnopqrstuvwxyz", "Zzz")).not.toMatch(/-$/);
  });
});
