import { describe, expect, it } from "vitest";
import { isAllowedSchoolEmail, emailDomain, normalizeEmail } from "@/lib/auth/domains";
import { getAllowedSchoolDomains } from "@/lib/env";

describe("school-domain restriction", () => {
  const domains = ["school.edu", "stu.school.edu"];

  it("parses ALLOWED_SCHOOL_DOMAINS with trimming, lowercasing and @ stripping", () => {
    expect(getAllowedSchoolDomains(" School.edu, @stu.school.edu ,, ")).toEqual(["school.edu", "stu.school.edu"]);
    expect(getAllowedSchoolDomains("")).toEqual([]);
  });

  it("accepts addresses on an allowed domain, case-insensitively", () => {
    expect(isAllowedSchoolEmail("ayse@school.edu", domains)).toBe(true);
    expect(isAllowedSchoolEmail("  Mehmet@STU.School.EDU ", domains)).toBe(true);
  });

  it("rejects public providers and look-alike domains", () => {
    expect(isAllowedSchoolEmail("someone@gmail.com", domains)).toBe(false);
    expect(isAllowedSchoolEmail("someone@school.edu.evil.com", domains)).toBe(false);
    expect(isAllowedSchoolEmail("someone@notschool.edu", domains)).toBe(false);
    expect(isAllowedSchoolEmail("someone@sub.school.edu", domains)).toBe(false); // subdomains must be listed explicitly
  });

  it("rejects malformed addresses", () => {
    expect(isAllowedSchoolEmail("school.edu", domains)).toBe(false);
    expect(isAllowedSchoolEmail("a@b", domains)).toBe(false);
    expect(isAllowedSchoolEmail("", domains)).toBe(false);
    expect(emailDomain("nope")).toBeNull();
  });

  it("fails closed when no domains are configured", () => {
    expect(isAllowedSchoolEmail("ayse@school.edu", [])).toBe(false);
  });

  it("uses the environment list by default", () => {
    expect(isAllowedSchoolEmail("x@school.edu")).toBe(true);
    expect(isAllowedSchoolEmail("x@outlook.com")).toBe(false);
  });

  it("normalizes emails", () => {
    expect(normalizeEmail("  A@B.Co ")).toBe("a@b.co");
  });
});
