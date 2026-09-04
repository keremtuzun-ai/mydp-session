import { describe, expect, it } from "vitest";
import { validateEvidenceFile, safeFileName } from "@/lib/validation/files";

describe("evidence file validation", () => {
  const max = 1024 * 1024;
  it("accepts PDF, PNG, JPG and DOCX", () => {
    expect(validateEvidenceFile({ name: "paper.pdf", type: "application/pdf", size: 1000 }, max).ok).toBe(true);
    expect(validateEvidenceFile({ name: "shot.png", type: "image/png", size: 1000 }, max).ok).toBe(true);
    expect(validateEvidenceFile({ name: "shot.JPG", type: "image/jpeg", size: 1000 }, max).ok).toBe(true);
    expect(validateEvidenceFile({ name: "draft.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1000 }, max).ok).toBe(true);
  });
  it("rejects other types, mismatched extensions, empty and oversized files", () => {
    expect(validateEvidenceFile({ name: "x.exe", type: "application/octet-stream", size: 10 }, max).ok).toBe(false);
    expect(validateEvidenceFile({ name: "x.pdf", type: "image/png", size: 10 }, max).ok).toBe(false);
    expect(validateEvidenceFile({ name: "x.pdf", type: "application/pdf", size: 0 }, max).ok).toBe(false);
    expect(validateEvidenceFile({ name: "x.pdf", type: "application/pdf", size: max + 1 }, max).ok).toBe(false);
  });
  it("sanitises file names for storage keys", () => {
    expect(safeFileName("Position Paper (final)!!.pdf")).toBe("Position-Paper-final-.pdf");
  });
});
