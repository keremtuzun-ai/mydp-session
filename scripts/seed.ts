/**
 * Development seed. Requires SUPABASE_SERVICE_ROLE_KEY. Run with
 *   npm run db:seed            (reads .env.local)
 * Safe to re-run: it upserts by email / slug and clears seeded content first.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database, Enums, TablesInsert } from "../src/lib/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD ?? "MunHub!2026";
const domains = (process.env.ALLOWED_SCHOOL_DOMAINS ?? "school.edu").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
const domain = domains[0] ?? "school.edu";

if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (put them in .env.local).");
  process.exit(1);
}

const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

type Role = Enums<"user_role">;
type SeedUser = { key: string; email: string; username: string; name: string; grade: string; role: Role; phone?: string };

const USERS: SeedUser[] = [
  { key: "admin", email: `admin@${domain}`, username: "mun-admin", name: "Deniz Öztürk", grade: "12", role: "admin", phone: "+90 532 000 0001" },
  { key: "exec", email: `leyla.sahin@${domain}`, username: "leyla-sahin", name: "Leyla Şahin", grade: "12", role: "executive", phone: "+90 532 000 0002" },
  { key: "chair_unsc", email: `selin.arslan@${domain}`, username: "selin-arslan", name: "Selin Arslan", grade: "11", role: "chair" },
  { key: "chair_who", email: `emre.yildiz@${domain}`, username: "emre-yildiz", name: "Emre Yıldız", grade: "11", role: "chair" },
  { key: "ayse", email: `ayse.demir@${domain}`, username: "ayse-demir", name: "Ayşe Demir", grade: "10", role: "delegate" },
  { key: "mehmet", email: `mehmet.kaya@${domain}`, username: "mehmet-kaya", name: "Mehmet Kaya", grade: "10", role: "delegate" },
  { key: "zeynep", email: `zeynep.celik@${domain}`, username: "zeynep-celik", name: "Zeynep Çelik", grade: "9", role: "delegate" },
  { key: "can", email: `can.aydin@${domain}`, username: "can-aydin", name: "Can Aydın", grade: "11", role: "delegate" },
  { key: "elif", email: `elif.koc@${domain}`, username: "elif-koc", name: "Elif Koç", grade: "9", role: "delegate" },
  { key: "burak", email: `burak.dogan@${domain}`, username: "burak-dogan", name: "Burak Doğan", grade: "12", role: "delegate" },
];

const COMMITTEES: TablesInsert<"committees">[] = [
  { slug: "unsc", acronym: "UNSC", name: "United Nations Security Council", category: "Security Council", description: "Fifteen seats, veto powers and crisis-paced debate on threats to international peace and security.", current_topic: "Maritime security and piracy in the Gulf of Guinea", is_open: true, submissions_enabled: true },
  { slug: "who", acronym: "WHO", name: "World Health Organization", category: "Specialised Agency", description: "Global health governance, from pandemic preparedness to access to essential medicines.", current_topic: "Antimicrobial resistance and the global supply of antibiotics", is_open: true, submissions_enabled: true },
  { slug: "unhcr", acronym: "UNHCR", name: "UN High Commissioner for Refugees", category: "Humanitarian", description: "Protection of refugees, asylum seekers and the internally displaced.", current_topic: "Climate-driven displacement and the limits of the 1951 Convention", is_open: true, submissions_enabled: true },
  { slug: "ecosoc", acronym: "ECOSOC", name: "Economic and Social Council", category: "General Assembly", description: "Coordinates economic and social work across the UN system.", current_topic: "Financing the transition to circular economies", is_open: true, submissions_enabled: false },
  { slug: "unwomen", acronym: "UN Women", name: "UN Entity for Gender Equality", category: "Specialised Agency", description: "Gender equality and the empowerment of women and girls.", current_topic: "Digital access and online safety for girls in secondary education", is_open: false, submissions_enabled: true },
  { slug: "hcc-1962", acronym: "HCC", name: "Historical Crisis: October 1962", category: "Historical Crisis", description: "A continuous crisis simulation of the Cuban Missile Crisis, with directives instead of resolutions.", current_topic: "ExComm deliberations, day three", is_open: true, submissions_enabled: false },
];

// Small but valid PDF used for seeded uploads and materials.
const PDF_BYTES = new TextEncoder().encode(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);

function daysFromNow(days: number, hour = 16, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}
/** Sessions meet twice every Tuesday: 10:50 and 15:05 (school periods, 45 min). */
const SLOTS: [number, number][] = [
  [10, 50],
  [15, 5],
];
/** Tuesday of the given week offset (0 = the next Tuesday from today), at the given slot. */
function tuesday(weekOffset: number, slot: number) {
  const d = new Date();
  const delta = (2 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta + weekOffset * 7);
  const [h, m] = SLOTS[slot]!;
  d.setHours(h, m, 0, 0);
  return d;
}
const iso = (d: Date) => d.toISOString();
const plusMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

async function ensureUser(u: SeedUser): Promise<string> {
  const { data: existing } = await db.from("profiles").select("id").eq("school_email", u.email).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { seeded: true } });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    id = data.user.id;
  } else {
    await db.auth.admin.updateUserById(id, { password, email_confirm: true });
  }
  const { error } = await db
    .from("profiles")
    .update({ username: u.username, display_name: u.name, grade: u.grade, phone: u.phone ?? null, role: u.role, onboarding_completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`profile ${u.email}: ${error.message}`);
  return id;
}

async function main() {
  console.log(`Seeding ${url} for domain @${domain}`);

  // Allowed domains
  await db.from("allowed_email_domains").upsert(domains.map((d) => ({ domain: d })));

  // Users
  const ids: Record<string, string> = {};
  for (const u of USERS) ids[u.key] = await ensureUser(u);
  const id = (k: string) => ids[k]!;
  console.log(`✓ ${USERS.length} users`);

  // Wipe seeded content (keeps users + committees)
  await db.from("tasks").delete().not("id", "is", null);
  await db.from("weekly_sessions").delete().not("id", "is", null);
  await db.from("announcements").delete().not("id", "is", null);
  await db.from("materials").delete().not("id", "is", null);
  await db.from("task_templates").delete().not("id", "is", null);
  await db.from("committee_memberships").delete().not("id", "is", null);
  await db.from("committee_submissions").delete().not("id", "is", null);
  for (const bucket of ["task-evidence", "materials", "committee-submissions"]) {
    const { data: files } = await db.storage.from(bucket).list("", { limit: 1000 });
    for (const f of files ?? []) {
      const { data: inner } = await db.storage.from(bucket).list(f.name, { limit: 1000 });
      const paths = (inner ?? []).map((x) => `${f.name}/${x.name}`);
      if (paths.length) await db.storage.from(bucket).remove(paths);
    }
  }

  // Committees
  const cids: Record<string, string> = {};
  for (const c of COMMITTEES) {
    const { data, error } = await db.from("committees").upsert(c, { onConflict: "slug" }).select("id, slug").single();
    if (error) throw new Error(`committee ${c.slug}: ${error.message}`);
    cids[data.slug] = data.id;
  }
  const cid = (s: string) => cids[s]!;
  console.log(`✓ ${COMMITTEES.length} committees`);

  // Memberships
  const memberships: TablesInsert<"committee_memberships">[] = [
    { profile_id: id("chair_unsc"), committee_id: cid("unsc"), membership_role: "chair" },
    { profile_id: id("exec"), committee_id: cid("unsc"), membership_role: "executive" },
    { profile_id: id("ayse"), committee_id: cid("unsc"), membership_role: "delegate", delegation: "France" },
    { profile_id: id("mehmet"), committee_id: cid("unsc"), membership_role: "delegate", delegation: "Ghana" },
    { profile_id: id("can"), committee_id: cid("unsc"), membership_role: "delegate", delegation: "Japan" },
    { profile_id: id("chair_who"), committee_id: cid("who"), membership_role: "chair" },
    { profile_id: id("zeynep"), committee_id: cid("who"), membership_role: "delegate", delegation: "Brazil" },
    { profile_id: id("elif"), committee_id: cid("who"), membership_role: "delegate", delegation: "Kenya" },
    { profile_id: id("burak"), committee_id: cid("who"), membership_role: "delegate", delegation: "Norway" },
    { profile_id: id("chair_unsc"), committee_id: cid("hcc-1962"), membership_role: "co_chair" },
    { profile_id: id("burak"), committee_id: cid("hcc-1962"), membership_role: "delegate", delegation: "Robert McNamara" },
    { profile_id: id("can"), committee_id: cid("unhcr"), membership_role: "delegate", delegation: "Türkiye" },
    { profile_id: id("elif"), committee_id: cid("ecosoc"), membership_role: "delegate", delegation: "Chile" },
  ];
  {
    const { error } = await db.from("committee_memberships").insert(memberships);
    if (error) throw new Error(`memberships: ${error.message}`);
  }
  console.log(`✓ ${memberships.length} memberships`);

  // Sessions: 4 past, 4 upcoming (two every Tuesday: 10:50 and 15:05)
  const sessionDefs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const w = Math.floor(i / 2) - 2;
    const start = tuesday(w, i % 2);
    const past = w < 0;
    const titles = ["Opening Session", "Rules of Procedure Workshop", "Committee Debate I", "Committee Debate II", "Position Paper Clinic", "Committee Debate III", "Crisis Simulation Day", "Resolution Drafting Lab"];
    return {
      title: titles[i]!,
      theme: ["Welcome and expectations", "Points, motions and the speakers' list", "Opening speeches", "Moderated caucus practice", "Research and writing", "Unmoderated caucus and blocs", "Directives under pressure", "Operative clauses and amendments"][i] + (i % 2 === 0 ? " · morning" : " · afternoon"),
      description: "Weekly session of the school MUN programme.",
      starts_at: iso(start),
      ends_at: iso(plusMinutes(start, 45)),
      location: i === 6 ? "Library seminar rooms" : "Room B204",
      meeting_url: i === 4 ? "https://meet.example.edu/mun-clinic" : null,
      dress_code: i >= 2 ? "Western business attire" : null,
      general_agenda: "1. Roll call\n2. Announcements from the Secretariat\n3. Committee time\n4. Chair debrief",
      status: (past ? "completed" : i === 7 ? "draft" : "published") as Enums<"session_status">,
      created_by: id("exec"),
    };
  });
  const { data: sessions, error: sErr } = await db.from("weekly_sessions").insert(sessionDefs).select("id, title, starts_at, status");
  if (sErr) throw new Error(`sessions: ${sErr.message}`);
  const sorted = [...sessions!].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const sid = (i: number) => sorted[i]!.id;
  console.log(`✓ ${sorted.length} sessions`);

  // Session committees
  const sc: TablesInsert<"session_committees">[] = [];
  sorted.forEach((s, i) => {
    for (const slug of i === 6 ? ["hcc-1962", "unsc"] : ["unsc", "who", "unhcr", "ecosoc"]) {
      sc.push({
        session_id: s.id,
        committee_id: cid(slug),
        topic: COMMITTEES.find((c) => c.slug === slug)?.current_topic ?? null,
        agenda: "Roll call · Speakers' list · Moderated caucus (5 min / 45 s) · Chair summary",
        chair_notes: i < 4 ? "Delegates of France and Ghana need speaking-time reminders. Check position paper follow-ups." : "Prepare the speakers' list in advance; bring printed rules cards.",
      });
    }
  });
  {
    const { error } = await db.from("session_committees").insert(sc);
    if (error) throw new Error(`session_committees: ${error.message}`);
  }

  // Tasks
  const tasks: TablesInsert<"tasks">[] = [
    { title: "Submit position paper: Gulf of Guinea", description: "One page, France's perspective. Cite at least two UNSC resolutions.", assigned_to_profile_id: id("ayse"), assigned_committee_id: cid("unsc"), session_id: sid(4), created_by: id("chair_unsc"), due_at: iso(daysFromNow(2, 20)), priority: "high", status: "in_progress" },
    { title: "Submit position paper: Gulf of Guinea", description: "One page, Ghana's perspective.", assigned_to_profile_id: id("mehmet"), assigned_committee_id: cid("unsc"), session_id: sid(4), created_by: id("chair_unsc"), due_at: iso(daysFromNow(2, 20)), priority: "high", status: "submitted" },
    { title: "Submit position paper: Gulf of Guinea", description: "One page, Japan's perspective.", assigned_to_profile_id: id("can"), assigned_committee_id: cid("unsc"), session_id: sid(4), created_by: id("chair_unsc"), due_at: iso(daysFromNow(-3, 20)), priority: "high", status: "overdue" },
    { title: "Opening speech draft", description: "60 seconds, no more than 140 words.", assigned_to_profile_id: id("ayse"), assigned_committee_id: cid("unsc"), session_id: sid(2), created_by: id("chair_unsc"), due_at: iso(daysFromNow(-12, 18)), priority: "normal", status: "completed", reviewed_by: id("chair_unsc"), reviewed_at: iso(daysFromNow(-11)) },
    { title: "Research brief: antibiotic supply chains", description: "Summarise WHO's 2024 AWaRe classification in half a page.", assigned_to_profile_id: id("zeynep"), assigned_committee_id: cid("who"), session_id: sid(4), created_by: id("chair_who"), due_at: iso(daysFromNow(4, 17)), priority: "normal", status: "not_started" },
    { title: "Research brief: antibiotic supply chains", description: "Kenya's perspective.", assigned_to_profile_id: id("elif"), assigned_committee_id: cid("who"), session_id: sid(4), created_by: id("chair_who"), due_at: iso(daysFromNow(4, 17)), priority: "normal", status: "reviewed", reviewed_by: id("chair_who"), reviewed_at: iso(daysFromNow(-1)), review_note: "Good start. Add the AMR figures for Sub-Saharan Africa and resubmit." },
    { title: "Read the Rules of Procedure guide", description: "Chapters 1 to 3 before the next session.", assigned_role: "delegate", created_by: id("exec"), due_at: iso(daysFromNow(6, 12)), priority: "low", status: "not_started" },
    { title: "Prepare a 5-minute moderated caucus topic", description: "Every UNSC delegate brings one caucus topic and a speakers' list.", assigned_committee_id: cid("unsc"), created_by: id("chair_unsc"), due_at: iso(daysFromNow(6, 12)), priority: "normal", status: "not_started" },
    { title: "Print delegate placards", description: "Placards for all committees meeting next week.", assigned_role: "chair", created_by: id("exec"), due_at: iso(daysFromNow(5, 9)), priority: "urgent", status: "in_progress" },
    { title: "Crisis backstory memo: McNamara", description: "Half a page on your character's stance on the blockade.", assigned_to_profile_id: id("burak"), assigned_committee_id: cid("hcc-1962"), session_id: sid(6), created_by: id("chair_unsc"), due_at: iso(daysFromNow(12, 18)), priority: "normal", status: "not_started" },
  ];
  const { data: insertedTasks, error: tErr } = await db.from("tasks").insert(tasks).select("id, title, assigned_to_profile_id, status");
  if (tErr) throw new Error(`tasks: ${tErr.message}`);
  console.log(`✓ ${insertedTasks!.length} tasks`);

  // Uploads (metadata + a real placeholder file so downloads work)
  const submitted = insertedTasks!.find((t) => t.status === "submitted")!;
  const completed = insertedTasks!.find((t) => t.status === "completed")!;
  const uploads = [
    { task: submitted, by: id("mehmet"), title: "Position paper, Ghana (final)", notes: "Sources in footnotes.", file: "ghana-position-paper.pdf" },
    { task: completed, by: id("ayse"), title: "Opening speech, France", notes: null, file: "france-opening-speech.pdf" },
  ];
  for (const u of uploads) {
    const path = `${u.task.id}/${crypto.randomUUID()}-${u.file}`;
    const { error: upErr } = await db.storage.from("task-evidence").upload(path, PDF_BYTES, { contentType: "application/pdf" });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { error } = await db.from("task_uploads").insert({ task_id: u.task.id, uploaded_by: u.by, title: u.title, notes: u.notes, storage_path: path, file_name: u.file, mime_type: "application/pdf", size_bytes: PDF_BYTES.byteLength });
    if (error) throw new Error(`task_uploads: ${error.message}`);
  }
  console.log(`✓ ${uploads.length} uploads`);

  // Attendance for the 4 past sessions
  const attendance: TablesInsert<"attendance_records">[] = [];
  const members = ["ayse", "mehmet", "can", "zeynep", "elif", "burak", "chair_unsc", "chair_who"];
  const pattern: Record<string, Enums<"attendance_status">[]> = {
    ayse: ["present", "present", "late", "present"],
    mehmet: ["present", "absent", "present", "present"],
    can: ["late", "present", "excused", "absent"],
    zeynep: ["present", "present", "present", "present"],
    elif: ["absent", "present", "present", "late"],
    burak: ["present", "excused", "present", "present"],
    chair_unsc: ["present", "present", "present", "present"],
    chair_who: ["present", "present", "late", "present"],
  };
  for (let i = 0; i < 4; i++) {
    for (const m of members) {
      const status = pattern[m]![i]!;
      attendance.push({ session_id: sid(i), profile_id: id(m), status, note: status === "excused" ? "School trip" : null, recorded_by: id("exec"), recorded_at: sorted[i]!.starts_at });
    }
  }
  {
    const { error } = await db.from("attendance_records").upsert(attendance, { onConflict: "session_id,profile_id" });
    if (error) throw new Error(`attendance: ${error.message}`);
  }
  console.log(`✓ ${attendance.length} attendance records`);

  // Feedback
  await db.from("session_feedback").insert([
    { session_id: sid(3), profile_id: id("ayse"), author_id: id("chair_unsc"), body: "Strong opening speech. Yield time more deliberately and use points of information." },
    { session_id: sid(3), profile_id: id("zeynep"), author_id: id("chair_who"), body: "Excellent bloc-building. Try to sponsor a working paper next session." },
  ]);

  // Announcements
  const announcements: TablesInsert<"announcements">[] = [
    { title: "Welcome to the new MUN year", body: "Sessions run every Tuesday at 10:50 and 15:05 in B204. Bring a notebook, your placard and a printed copy of the rules.", author_id: id("exec"), pinned: true },
    { title: "Position papers due before the clinic", body: "Every delegate in UNSC and WHO uploads a one-page position paper before the Position Paper Clinic. Use the template in Materials.", author_id: id("exec"), pinned: true, target_session_id: sid(4) },
    { title: "UNSC: speakers' list opens at 15:40", body: "Arrive five minutes early. Delegates of Ghana and Japan open the general speakers' list.", author_id: id("chair_unsc"), pinned: false, target_committee_id: cid("unsc") },
    { title: "Chairs: placards and rules cards", body: "Collect placards from the Secretariat desk before your committee time.", author_id: id("exec"), pinned: false, target_role: "chair" },
    { title: "WHO: background guide updated", body: "Section 3 now covers the 2024 AWaRe classification. Reread before the next debate.", author_id: id("chair_who"), pinned: false, target_committee_id: cid("who") },
  ];
  {
    const { error } = await db.from("announcements").insert(announcements);
    if (error) throw new Error(`announcements: ${error.message}`);
  }
  console.log(`✓ ${announcements.length} announcements`);

  // Materials
  const materialDefs: (Omit<TablesInsert<"materials">, "uploaded_by" | "storage_path"> & { file?: string })[] = [
    { title: "Rules of Procedure (school edition)", description: "Points, motions, voting procedure and the speakers' list.", category: "rules_of_procedure", visibility: "everyone", file: "rules-of-procedure.pdf" },
    { title: "Position paper template", description: "One page. Header, three paragraphs, sources.", category: "template", visibility: "everyone", file: "position-paper-template.pdf" },
    { title: "UNSC study guide: maritime security", description: "Background, past action, bloc positions, questions a resolution must answer.", category: "study_guide", committee_id: cid("unsc"), visibility: "committee", file: "unsc-study-guide.pdf" },
    { title: "WHO topic brief: antimicrobial resistance", category: "topic_brief", committee_id: cid("who"), visibility: "committee", file: "who-topic-brief.pdf" },
    { title: "Opening session slides", category: "slide_deck", session_id: sid(0), visibility: "everyone", file: "opening-session-slides.pdf" },
    { title: "UN Digital Library", description: "Search resolutions and reports.", category: "research_source", visibility: "everyone", external_url: "https://digitallibrary.un.org/" },
    { title: "Chair briefing: running a moderated caucus", category: "study_guide", visibility: "staff", file: "chair-briefing.pdf" },
  ];
  for (const m of materialDefs) {
    const { file, ...rest } = m;
    let storage_path: string | null = null;
    if (file) {
      storage_path = `${crypto.randomUUID()}/${file}`;
      const { error: upErr } = await db.storage.from("materials").upload(storage_path, PDF_BYTES, { contentType: "application/pdf" });
      if (upErr) throw new Error(`material upload: ${upErr.message}`);
    }
    const { error } = await db.from("materials").insert({ ...rest, uploaded_by: id("exec"), storage_path, file_name: file ?? null, mime_type: file ? "application/pdf" : null, size_bytes: file ? PDF_BYTES.byteLength : null });
    if (error) throw new Error(`material ${m.title}: ${error.message}`);
  }
  console.log(`✓ ${materialDefs.length} materials`);

  // Templates
  await db.from("task_templates").insert([
    { title: "Position paper", description: "One page from your delegation's perspective, with sources.", priority: "high", default_due_days: 7, created_by: id("exec") },
    { title: "Opening speech", description: "60 seconds, no more than 140 words.", priority: "normal", default_due_days: 5, created_by: id("exec") },
    { title: "Working paper draft", description: "Preambular and operative clauses, bloc co-sponsors listed.", priority: "normal", default_due_days: 10, created_by: id("exec") },
  ]);

  await db.from("audit_logs").insert({ actor_id: id("admin"), action: "seed.applied", entity_type: "system", metadata: { users: USERS.length, committees: COMMITTEES.length } });

  console.log("\nDevelopment accounts (password: %s)", password);
  for (const u of USERS) console.log(`  ${u.role.padEnd(9)} ${u.username.padEnd(14)} ${u.email}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
