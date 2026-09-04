import { z } from "zod";
import { usernameSchema } from "@/lib/auth/username";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const otpSchema = z.object({
  email: emailSchema,
  token: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const passwordLoginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export const GRADES = ["9", "10", "11", "12"] as const;

export const signUpSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const emailPasswordLoginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password") });

export const onboardingSchema = z.object({
  display_name: z.string().trim().min(2, "Enter your full name").max(80),
  grade: z.enum(GRADES, { message: "Select your grade" }),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  username: usernameSchema,
});

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  grade: z.enum(GRADES),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{6,20}$/, "Enter a valid phone number").optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const uuid = z.string().uuid();

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TASK_STATUSES = ["not_started", "in_progress", "submitted", "reviewed", "completed", "overdue"] as const;
export const SESSION_STATUSES = ["draft", "published", "completed", "cancelled"] as const;
export const ATTENDANCE_STATUSES = ["present", "late", "excused", "absent"] as const;
export const MATERIAL_CATEGORIES = [
  "study_guide",
  "rules_of_procedure",
  "topic_brief",
  "research_source",
  "template",
  "slide_deck",
  "recording",
] as const;
export const MATERIAL_VISIBILITIES = ["everyone", "committee", "staff"] as const;
export const USER_ROLE_VALUES = ["admin", "executive", "chair", "delegate"] as const;
export const MEMBERSHIP_ROLE_VALUES = ["delegate", "chair", "co_chair", "executive"] as const;

const optionalUuid = z.union([uuid, z.literal("")]).transform((v) => (v === "" ? null : v));
const optionalText = (max: number) => z.string().trim().max(max).transform((v) => (v === "" ? null : v));
const optionalDate = z.string().transform((v) => (v ? new Date(v).toISOString() : null));

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(140),
  description: optionalText(4000),
  assigned_to_profile_id: optionalUuid,
  assigned_role: z.union([z.enum(USER_ROLE_VALUES), z.literal("")]).transform((v) => (v === "" ? null : v)),
  assigned_committee_id: optionalUuid,
  session_id: optionalUuid,
  due_at: optionalDate,
  priority: z.enum(TASK_PRIORITIES),
});

export const taskStatusSchema = z.object({
  task_id: uuid,
  status: z.enum(TASK_STATUSES),
  note: optionalText(1000).optional(),
});

export const sessionSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: optionalText(4000),
    theme: optionalText(140),
    starts_at: z.string().min(1, "Choose a start time").transform((v) => new Date(v).toISOString()),
    ends_at: z.string().min(1, "Choose an end time").transform((v) => new Date(v).toISOString()),
    location: optionalText(200),
    meeting_url: z.union([z.string().trim().url("Enter a valid link"), z.literal("")]).transform((v) => v || null),
    dress_code: optionalText(120),
    general_agenda: optionalText(6000),
    status: z.enum(SESSION_STATUSES),
    committee_ids: z.array(uuid).default([]),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), { path: ["ends_at"], message: "End must be after start" });

export const sessionCommitteeSchema = z.object({
  session_committee_id: uuid,
  topic: optionalText(200),
  agenda: optionalText(6000),
  chair_notes: optionalText(6000),
});

export const committeeSchema = z.object({
  acronym: z.string().trim().min(2).max(16),
  name: z.string().trim().min(3).max(140),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, "Lowercase letters, numbers and hyphens"),
  category: z.string().trim().min(2).max(60),
  description: optionalText(2000),
  current_topic: optionalText(300),
  background_guide_url: z.union([z.string().trim().url(), z.literal("")]).transform((v) => v || null),
  is_open: z.boolean(),
  submissions_enabled: z.boolean(),
});

export const membershipSchema = z.object({
  committee_id: uuid,
  profile_id: uuid,
  membership_role: z.enum(MEMBERSHIP_ROLE_VALUES),
  delegation: optionalText(80),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(3).max(8000),
  pinned: z.boolean(),
  target_role: z.union([z.enum(USER_ROLE_VALUES), z.literal("")]).transform((v) => (v === "" ? null : v)),
  target_committee_id: optionalUuid,
  target_session_id: optionalUuid,
});

export const attendanceSchema = z.object({
  session_id: uuid,
  profile_id: uuid,
  status: z.enum(ATTENDANCE_STATUSES),
  note: optionalText(500),
});

export const materialSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: optionalText(2000),
  category: z.enum(MATERIAL_CATEGORIES),
  committee_id: optionalUuid,
  session_id: optionalUuid,
  visibility: z.enum(MATERIAL_VISIBILITIES),
  external_url: z.union([z.string().trim().url("Enter a valid link"), z.literal("")]).transform((v) => v || null),
});

export const taskTemplateSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: optionalText(4000),
  priority: z.enum(TASK_PRIORITIES),
  default_due_days: z.coerce.number().int().min(0).max(365),
});

export const adminUserSchema = z.object({
  profile_id: uuid,
  role: z.enum(USER_ROLE_VALUES),
});

export const RESOLUTION_KINDS = ["position_paper", "working_paper", "draft_resolution", "amendment", "other"] as const;
export const RESOLUTION_KIND_LABEL: Record<(typeof RESOLUTION_KINDS)[number], string> = {
  position_paper: "Position paper",
  working_paper: "Working paper",
  draft_resolution: "Draft resolution",
  amendment: "Amendment",
  other: "Other document",
};

export const resolutionLinkSchema = z.object({
  committee_id: uuid,
  title: z.string().trim().min(2, "Give the document a title").max(140),
  url: z
    .string()
    .trim()
    .url("Paste the full link, starting with https://")
    .refine((v) => v.startsWith("https://"), "Links must start with https://"),
  kind: z.enum(RESOLUTION_KINDS),
  notes: optionalText(1000),
});
