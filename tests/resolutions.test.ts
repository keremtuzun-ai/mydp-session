import { describe, expect, it } from "vitest";
import { delegationKey, displayDelegation, isNoDelegation, previewKind, sanitizeDocHtml } from "@/lib/resolutions";
import { uploadMetaSchema } from "@/lib/validation/files";

describe("delegations", () => {
  it("groups delegations regardless of case and spacing", () => {
    expect(delegationKey("France")).toBe("france");
    expect(delegationKey("  united   KINGDOM ")).toBe("united kingdom");
  });
  it("recognises submissions without a delegation", () => {
    for (const v of ["N/A", "na", "none", "-", "", null, undefined]) expect(isNoDelegation(v)).toBe(true);
    expect(isNoDelegation("Türkiye")).toBe(false);
  });
  it("title-cases lower-case input but leaves typed capitals alone", () => {
    expect(displayDelegation("south africa")).toBe("South Africa");
    expect(displayDelegation("UAE")).toBe("UAE");
  });
});

describe("submissions", () => {
  it("require the link", () => {
    expect(uploadMetaSchema.safeParse({ delegation: "France", external_url: "" }).success).toBe(false);
    expect(uploadMetaSchema.safeParse({ delegation: "France", external_url: "http://x.y" }).success).toBe(false);
    expect(uploadMetaSchema.safeParse({ delegation: "France", external_url: "https://docs.google.com/document/d/1" }).success).toBe(true);
  });
  it("require the delegation", () => {
    expect(uploadMetaSchema.safeParse({ delegation: " ", external_url: "https://docs.google.com/document/d/1" }).success).toBe(false);
  });
});

describe("preview", () => {
  it("maps mime types to viewers", () => {
    expect(previewKind("application/pdf")).toBe("pdf");
    expect(previewKind("image/png")).toBe("image");
    expect(previewKind("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
    expect(previewKind(null)).toBe("unknown");
  });
  it("strips scripts, handlers and unsafe links from converted DOCX", () => {
    const html = `<p onclick="x()">Hi <a href="javascript:alert(1)">a</a> <a href='https://un.org'>b</a></p><script>1</script><img src="data:image/png;base64,AA">`;
    const out = sanitizeDocHtml(html);
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="https://un.org"');
    expect(out).toContain('src="data:image/png;base64,AA"');
  });
});
