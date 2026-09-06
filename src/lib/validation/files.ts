import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "@/lib/env";

export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export const ALLOWED_EXTENSIONS = Object.values(ALLOWED_UPLOAD_TYPES).flat();
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.join(",");

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type FileMeta = { name: string; type: string; size: number };

export function validateEvidenceFile(file: FileMeta, maxBytes = MAX_UPLOAD_BYTES): { ok: true } | { ok: false; error: string } {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const allowedExts = ALLOWED_UPLOAD_TYPES[file.type];
  if (!allowedExts) return { ok: false, error: "Only PDF, PNG, JPG and DOCX files are accepted." };
  if (!allowedExts.includes(ext)) return { ok: false, error: `File extension ${ext || "(none)"} does not match its type.` };
  if (file.size <= 0) return { ok: false, error: "The file is empty." };
  if (file.size > maxBytes) return { ok: false, error: `Files must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  return { ok: true };
}

export const uploadMetaSchema = z.object({
  title: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  delegation: z.string().trim().min(1, "Enter your delegation, or N/A").max(80),
  external_url: z
    .string()
    .trim()
    .min(1, "Paste the link to your document")
    .url("Paste the full link, starting with https://")
    .refine((v) => v.startsWith("https://"), "Links must start with https://"),
});

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 100);
}
