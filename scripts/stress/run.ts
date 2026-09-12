/**
 * Session stress test: drives the LIVE app the way browsers do.
 *
 *   npx tsx --env-file=.env.local scripts/stress/run.ts
 *
 * Environment: STRESS_BASE_URL (default https://mun-session-hub.vercel.app),
 * STRESS_MINUTES (30), STRESS_EXECS (3), STRESS_JUNIORS (20), STRESS_SENIORS (20),
 * STRESS_COUNTRIES (20). Needs the Supabase service role only for reading the
 * issued codes, snapshotting/restoring the live resolution state and cleaning
 * up. Everything else goes through the app's own pages and server actions.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { SENIORS } from "../../src/lib/seniors";

const BASE = (process.env.STRESS_BASE_URL ?? "https://mun-session-hub.vercel.app").replace(/\/$/, "");
const MINUTES = Number(process.env.STRESS_MINUTES ?? 30);
const N_EXECS = Number(process.env.STRESS_EXECS ?? 3);
const N_JUNIORS = Number(process.env.STRESS_JUNIORS ?? 20);
const N_SENIORS = Number(process.env.STRESS_SENIORS ?? 20);
const N_COUNTRIES = Number(process.env.STRESS_COUNTRIES ?? 20);
const KEEP = process.env.STRESS_KEEP === "1";

/** Server action ids are read from the live site's own client bundles (they differ per build). */
const ACTION: Record<"signInWithAccessCode" | "createMemberAccount" | "createTask" | "uploadEvidence" | "publishResolution" | "openVoting" | "closeVoting" | "castVote", string> = {
  signInWithAccessCode: "",
  createMemberAccount: "",
  createTask: "",
  uploadEvidence: "",
  publishResolution: "",
  openVoting: "",
  closeVoting: "",
  castVote: "",
};
const seenChunks = new Set<string>();
async function discoverActions(html: string) {
  const chunks = [...new Set(html.match(/\/_next\/static\/(?:immutable\/)?chunks\/[^"'\s\\]+\.js/g) ?? [])].filter((c) => !seenChunks.has(c));
  await Promise.all(
    chunks.map(async (c) => {
      seenChunks.add(c);
      const js = await (await fetch(BASE + c)).text();
      for (const m of js.matchAll(/createServerReference\)\("([0-9a-f]{40,})"[^)]*?"(\w+)"\)/g)) {
        if (m[2]! in ACTION) (ACTION as Record<string, string>)[m[2]!] = m[1]!;
      }
    }),
  );
}
function needAction(name: keyof typeof ACTION) {
  if (!ACTION[name]) throw new Error(`Could not find the id of server action ${name} in the live bundles`);
  return ACTION[name];
}

const COUNTRIES = ["Argentina", "Australia", "Brazil", "Canada", "Chile", "Denmark", "Egypt", "Finland", "Ghana", "Greece", "India", "Japan", "Kenya", "Mexico", "Norway", "Peru", "Poland", "Portugal", "Sweden", "Vietnam", "Austria", "Belgium", "Colombia", "Croatia", "Estonia"].slice(0, N_COUNTRIES);
const CHOICES = ["favour", "against", "abstain"] as const;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

// ───────────────────────── metrics ─────────────────────────
type Sample = { ms: number; ok: boolean };
const metrics = new Map<string, Sample[]>();
const errors: string[] = [];
function record(label: string, ms: number, ok: boolean, err?: string) {
  (metrics.get(label) ?? metrics.set(label, []).get(label)!).push({ ms, ok });
  if (!ok && err && errors.length < 60) errors.push(`${new Date().toISOString().slice(11, 19)} ${label}: ${err}`);
}
function pct(arr: number[], p: number) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}
const rt = { events: 0, lagMs: [] as number[], bursts: [] as { label: string; expectedPerExec: number; received: number[]; votesOk: number; window: number }[] };
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rnd = (n: number) => Math.floor(Math.random() * n);
const jitter = (min: number, max: number) => min + Math.random() * (max - min);
const key = (d: string) => d.trim().toLowerCase().replace(/\s+/g, " ");

// ───────────────────────── one browser session ─────────────────────────
class Session {
  cookies = new Map<string, string>();
  lastHtml = "";
  constructor(public name: string) {}
  private cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  private absorb(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(";");
      const i = pair!.indexOf("=");
      const k = pair!.slice(0, i).trim();
      const v = pair!.slice(i + 1).trim();
      const dead = attrs.some((a) => /max-age=0/i.test(a)) || v === "";
      if (dead) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
  }
  async get(path: string, label: string) {
    const t = performance.now();
    try {
      const res = await fetch(BASE + path, { headers: { cookie: this.cookieHeader(), accept: "text/html,application/json" }, redirect: "manual" });
      this.absorb(res);
      const ms = performance.now() - t;
      const ok = res.status === 200;
      const text = await res.text();
      record(label, ms, ok, ok ? undefined : `${res.status} ${res.headers.get("location") ?? ""}`);
      this.lastHtml = ok ? text : "";
      return ok;
    } catch (e) {
      record(label, performance.now() - t, false, String(e));
      return false;
    }
  }
  /** Calls a server action the way the Next client does; returns the ActionResult if one came back. */
  async action(id: string, label: string, args: unknown[] | FormData, path = "/resolutions"): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string; redirect?: string }> {
    const headers: Record<string, string> = { accept: "text/x-component", "next-action": id, cookie: this.cookieHeader() };
    let body: BodyInit;
    if (args instanceof FormData) {
      // Same layout React's encodeReply produces: the FormData's fields with a "_1_" prefix, then the root "0" last.
      const fd = new FormData();
      args.forEach((v, k) => fd.append(`_1_${k}`, v));
      fd.set("0", JSON.stringify([null, "$K1"]));
      body = fd;
    } else {
      headers["content-type"] = "text/plain;charset=UTF-8";
      body = JSON.stringify(args);
    }
    const t = performance.now();
    try {
      const res = await fetch(BASE + path, { method: "POST", headers, body, redirect: "manual" });
      this.absorb(res);
      const text = await res.text();
      const ms = performance.now() - t;
      const redirect = res.headers.get("x-action-redirect") ?? undefined;
      const line = text.split("\n").find((l) => /^\d+:\{"ok":(true|false)/.test(l));
      const result = line ? (JSON.parse(line.slice(line.indexOf(":") + 1)) as { ok: boolean; data?: Record<string, unknown>; error?: string }) : null;
      const ok = res.status === 200 && (result ? result.ok : Boolean(redirect));
      record(label, ms, ok, ok ? undefined : `${res.status} ${result?.error ?? text.slice(0, 160).replace(/\s+/g, " ")}`);
      return { ok, data: result?.data, error: result?.error, redirect };
    } catch (e) {
      record(label, performance.now() - t, false, String(e));
      return { ok: false, error: String(e) };
    }
  }
  async login(code: string) {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("next", "/dashboard");
    const r = await this.action(needAction("signInWithAccessCode"), "login", fd, "/login");
    return r.ok && this.cookies.size > 0;
  }
}

// ───────────────────────── realtime listener (what useLiveChannel does) ─────────────────────────
class Live {
  client: SupabaseClient;
  topics = new Map<string, ReturnType<SupabaseClient["channel"]>>();
  constructor(public onEvent: (topic: string) => void) {
    this.client = createClient(url, anon, { auth: { persistSession: false } });
  }
  subscribe(topic: string) {
    if (this.topics.has(topic)) return;
    const ch = this.client
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: "changed" }, (msg) => {
        rt.events++;
        const at = Number((msg.payload as { at?: number })?.at);
        if (Number.isFinite(at)) rt.lagMs.push(Date.now() - at);
        this.onEvent(topic);
      })
      .subscribe();
    this.topics.set(topic, ch);
  }
  unsubscribe(topic: string) {
    const ch = this.topics.get(topic);
    if (ch) {
      void this.client.removeChannel(ch);
      this.topics.delete(topic);
    }
  }
  close() {
    void this.client.removeAllChannels();
  }
}

// ───────────────────────── helpers ─────────────────────────
function pdf(label: string, kb: number): Blob {
  const filler = `% ${"stress ".repeat(64)}\n`;
  const body = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 72 760 Td (${label}) Tj ET\nendstream\nendobj\n`;
  const pad = filler.repeat(Math.max(0, Math.ceil((kb * 1024 - body.length) / filler.length)));
  return new Blob([body + pad + "trailer<</Root 1 0 R>>\n%%EOF\n"], { type: "application/pdf" });
}
async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const n = i++;
      if (n >= items.length) return;
      await fn(items[n]!, n);
    }
  }));
}

type Member = { name: string; tier: "junior" | "senior"; code: string; id: string; session: Session; live: Live; country?: string; viewing?: string };

// ───────────────────────── snapshot / cleanup of live data ─────────────────────────
async function snapshot() {
  return {
    publications: (await admin.from("resolution_publications").select("*")).data ?? [],
    votings: (await admin.from("resolution_votings").select("*")).data ?? [],
    votes: (await admin.from("resolution_votes").select("*")).data ?? [],
  };
}
async function cleanup(snap: Awaited<ReturnType<typeof snapshot>>, taskId: string | null, memberIds: string[]) {
  log("cleanup: removing stress members, uploads, files, task; restoring the live resolution state");
  const { data: ups } = memberIds.length ? await admin.from("task_uploads").select("storage_path").in("uploaded_by", memberIds) : { data: [] };
  const paths = (ups ?? []).map((u) => u.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) await admin.storage.from("task-evidence").remove(paths);
  for (const id of memberIds) await admin.auth.admin.deleteUser(id);
  const { data: leftovers } = await admin.from("profiles").select("id").like("username", "stress-%");
  for (const p of leftovers ?? []) await admin.auth.admin.deleteUser(p.id);
  if (taskId) await admin.from("tasks").delete().eq("id", taskId);
  await admin.from("tasks").delete().like("title", "Stress test %");
  // Anything published by the desk during the test that points at a deleted upload is gone by cascade; put Kerem's rows back verbatim.
  await admin.from("resolution_publications").delete().not("delegation_key", "in", `(${snap.publications.map((p) => `"${p.delegation_key}"`).join(",") || '"__none__"'})`);
  if (snap.publications.length) await admin.from("resolution_publications").upsert(snap.publications);
  if (snap.votings.length) await admin.from("resolution_votings").upsert(snap.votings);
  if (snap.votes.length) await admin.from("resolution_votes").upsert(snap.votes);
  log("cleanup done");
}

// ───────────────────────── the test ─────────────────────────
async function main() {
  log(`stress test against ${BASE}: ${N_EXECS} execs, ${N_JUNIORS} juniors, ${N_SENIORS} seniors, ${N_COUNTRIES} countries, ${MINUTES} min`);
  const snap = await snapshot();
  log(`live state saved: ${snap.publications.length} publications, ${snap.votings.length} rounds, ${snap.votes.length} votes`);
  const { data: execProfile } = await admin.from("profiles").select("id").eq("username", "executive").maybeSingle();
  const { data: execCodeRow } = execProfile ? await admin.from("access_codes").select("code").eq("profile_id", execProfile.id).maybeSingle() : { data: null };
  const execCode = execCodeRow?.code;
  if (!execCode) throw new Error("The shared executive account has no access code");

  const members: Member[] = [];
  let taskId: string | null = null;
  const execs: { session: Session; live: Live }[] = [];
  let stopping = false;
  const finish = async (why: string) => {
    if (stopping) return;
    stopping = true;
    log("finishing:", why);
    for (const m of members) m.live.close();
    for (const e of execs) e.live.close();
    if (!KEEP) await cleanup(snap, taskId, members.map((m) => m.id));
    report();
    process.exit(0);
  };
  process.on("SIGINT", () => void finish("interrupted"));

  const t0 = Date.now();
  // ── Phase 0: the desk signs in and creates every account and the task ──
  const desk = new Session("desk");
  await desk.get("/login", "GET login page");
  await discoverActions(desk.lastHtml);
  if (!(await desk.login(execCode))) throw new Error("desk login failed: " + errors.at(-1));
  for (const path of ["/exec", "/admin", "/calendar/new", "/resolutions"]) {
    await desk.get(path, "GET desk page");
    await discoverActions(desk.lastHtml);
  }
  needAction("createMemberAccount");
  needAction("createTask");
  const wanted = [...Array.from({ length: N_JUNIORS }, (_, i) => ({ tier: "junior" as const, last: `Junior${String(i + 1).padStart(2, "0")}` })), ...Array.from({ length: N_SENIORS }, (_, i) => ({ tier: "senior" as const, last: `Senior${String(i + 1).padStart(2, "0")}` }))];
  await pool(wanted, 4, async (w) => {
    const fd = new FormData();
    fd.set("first_name", "Stress");
    fd.set("last_name", w.last);
    fd.set("tier", w.tier);
    const r = await desk.action(ACTION.createMemberAccount, "createMember", fd, "/admin");
    if (r.ok && r.data) {
      const d = r.data as { id: string; name: string; code: string };
      members.push({ name: d.name, tier: w.tier, code: d.code, id: d.id, session: new Session(d.name), live: new Live(() => {}) });
    }
  });
  log(`created ${members.length}/${wanted.length} accounts in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (members.length < wanted.length) log("some accounts failed:", errors.filter((e) => e.includes("createMember")).slice(0, 3));

  {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ title: "Stress test resolution", author_name: "Stress Exec", description: "Load test. Will be deleted.", committee_label: "", assigned_to_profile_id: "", assigned_role: "", assigned_committee_id: "", session_id: "", due_at: "", priority: "normal" })) fd.set(k, v);
    const r = await desk.action(ACTION.createTask, "createTask", fd, "/calendar/new");
    taskId = (r.data as { id?: string } | undefined)?.id ?? null;
    if (!taskId) throw new Error("createTask failed: " + r.error);
    log("task created", taskId);
    await desk.get(`/calendar/${taskId}`, "GET desk page");
    await discoverActions(desk.lastHtml);
    for (const name of ["uploadEvidence", "publishResolution", "openVoting", "closeVoting", "castVote"] as const) needAction(name);
    log("action ids resolved from the live bundles");
  }

  // ── Phase 1: everybody signs in at once (the 10:55 moment) ──
  const t1 = Date.now();
  execs.push({ session: desk, live: new Live(() => {}) });
  for (let i = 1; i < N_EXECS; i++) {
    const s = new Session(`exec${i + 1}`);
    if (await s.login(execCode)) execs.push({ session: s, live: new Live(() => {}) });
  }
  await pool(members, 10, async (m) => {
    if (await m.session.login(m.code)) await m.session.get("/dashboard", "GET dashboard");
  });
  const loggedIn = members.filter((m) => m.session.cookies.size > 0);
  log(`logins: ${loggedIn.length}/${members.length} members + ${execs.length} execs in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

  // Realtime: execs hear every round (the board), members hear the round they are looking at.
  for (const e of execs) {
    e.live.onEvent = (topic) => {
      if (topic.startsWith("voting:")) void e.session.get(`/api/votes/${encodeURIComponent(topic.slice(7))}`, "GET api/votes (event)");
      else void e.session.get("/resolutions", "GET resolutions (event)");
    };
    e.live.subscribe("resolutions");
  }
  for (const m of loggedIn) {
    m.live.onEvent = (topic) => {
      if (topic.startsWith("voting:")) void m.session.get(`/api/votes/${encodeURIComponent(topic.slice(7))}`, "GET api/votes (event)");
      else void m.session.get("/resolutions", "GET resolutions (event)");
    };
    m.live.subscribe("resolutions");
  }

  // ── Phase 2: 20 delegations submit, the desk shares them and opens voting ──
  const t2 = Date.now();
  const delegates = loggedIn.slice(0, COUNTRIES.length);
  delegates.forEach((m, i) => (m.country = COUNTRIES[i]));
  await pool(delegates, 5, async (m, i) => {
    const fd = new FormData();
    fd.set("task_id", taskId!);
    fd.set("title", `${m.country} draft resolution`);
    fd.set("notes", "");
    fd.set("delegation", m.country!);
    fd.set("external_url", `https://docs.google.com/document/d/stress-${key(m.country!)}`);
    fd.append("seniors", SENIORS[i % SENIORS.length]!);
    fd.append("seniors", SENIORS[(i + 1) % SENIORS.length]!);
    fd.set("file", pdf(m.country!, 180), `${key(m.country!)}.pdf`);
    await m.session.action(ACTION.uploadEvidence, "upload (180 KB pdf)", fd, `/calendar/${taskId}`);
  });
  const { data: uploads } = await admin.from("task_uploads").select("id, delegation").eq("task_id", taskId).not("storage_path", "is", null);
  log(`uploads: ${uploads?.length ?? 0}/${delegates.length} in ${((Date.now() - t2) / 1000).toFixed(1)}s`);
  const keys: string[] = [];
  await pool(uploads ?? [], 4, async (u) => {
    const r = await desk.action(ACTION.publishResolution, "publish", [{ uploadId: u.id }]);
    if (r.ok) {
      const k = key(u.delegation ?? "");
      keys.push(k);
      await desk.action(ACTION.openVoting, "openVoting", [{ key: k }]);
    }
  });
  for (const e of execs) for (const k of keys) e.live.subscribe(`voting:${k}`);
  log(`shared + opened ${keys.length} rounds; ${execs.length} desks listening on every round`);

  // ── Phase 3: the session itself ──
  const end = t0 + MINUTES * 60_000;
  const burstAt = [t0 + MINUTES * 60_000 * 0.4, t0 + MINUTES * 60_000 * 0.7];
  const view = (m: Member, k: string) => {
    if (m.viewing) m.live.unsubscribe(`voting:${m.viewing}`);
    m.viewing = k;
    m.live.subscribe(`voting:${k}`);
  };
  const memberLoop = async (m: Member) => {
    await sleep(jitter(0, 15_000));
    while (Date.now() < end && !stopping) {
      const k = keys[rnd(keys.length)]!;
      view(m, k);
      await m.session.get(`/resolutions/${encodeURIComponent(k)}`, "GET resolution page");
      await m.session.get(`/api/votes/${encodeURIComponent(k)}`, "GET api/votes (poll)");
      if (Math.random() < 0.75) await m.session.action(ACTION.castVote, "castVote", [{ key: k, choice: CHOICES[rnd(3)] }]);
      const dwell = jitter(20_000, 40_000);
      const until = Date.now() + dwell;
      while (Date.now() < until && !stopping) {
        await sleep(Math.min(15_000, until - Date.now()));
        if (Date.now() < until) await m.session.get(`/api/votes/${encodeURIComponent(k)}`, "GET api/votes (poll)");
      }
      if (Math.random() < 0.3) await m.session.get(Math.random() < 0.5 ? "/dashboard" : "/resolutions", "GET dashboard/resolutions");
    }
  };
  const execLoop = async (e: { session: Session; live: Live }, i: number) => {
    await sleep(jitter(0, 5_000));
    while (Date.now() < end && !stopping) {
      // The board's 20 panels each poll every 15 s; the desk itself wanders between pages.
      await Promise.all(keys.map((k) => e.session.get(`/api/votes/${encodeURIComponent(k)}`, "GET api/votes (poll)")));
      if (Math.random() < 0.3) await e.session.get(["/resolutions", "/exec", "/exec/uploads", "/exec/attendance"][rnd(4)]!, "GET desk page");
      if (i === 0 && Math.random() < 0.15 && keys.length) {
        const k = keys[rnd(keys.length)]!;
        await e.session.action(ACTION.closeVoting, "closeVoting", [{ key: k }]);
        await sleep(jitter(5_000, 15_000));
        await e.session.action(ACTION.openVoting, "openVoting", [{ key: k }]);
      }
      await sleep(15_000);
    }
  };
  const burstLoop = async () => {
    for (const at of burstAt) {
      while (Date.now() < at && !stopping) await sleep(1000);
      if (stopping || Date.now() >= end) return;
      const k = keys[rnd(keys.length)]!;
      const before = rt.events;
      const perExec = execs.map((e) => 0);
      const counters = execs.map((e, i) => {
        const prev = e.live.onEvent;
        e.live.onEvent = (topic) => {
          if (topic === `voting:${k}`) perExec[i]!++;
          prev(topic);
        };
        return prev;
      });
      log(`BURST: all ${loggedIn.length} members vote on ${k} at once`);
      const tb = Date.now();
      const results = await Promise.all(loggedIn.map((m) => m.session.action(ACTION.castVote, "castVote (burst)", [{ key: k, choice: CHOICES[rnd(3)] }])));
      const votesOk = results.filter((r) => r.ok).length;
      await sleep(15_000);
      execs.forEach((e, i) => (e.live.onEvent = counters[i]!));
      rt.bursts.push({ label: `${k} @ ${new Date(tb).toISOString().slice(11, 19)}`, expectedPerExec: votesOk, received: perExec, votesOk, window: Date.now() - tb });
      log(`burst done: ${votesOk}/${loggedIn.length} votes accepted, desks received ${perExec.join("/")} events (${rt.events - before} total)`);
    }
  };
  const progress = async () => {
    while (Date.now() < end && !stopping) {
      await sleep(60_000);
      const total = [...metrics.values()].reduce((n, s) => n + s.length, 0);
      const bad = [...metrics.values()].reduce((n, s) => n + s.filter((x) => !x.ok).length, 0);
      log(`… ${Math.round((Date.now() - t0) / 60_000)} min: ${total} requests, ${bad} errors, ${rt.events} realtime events`);
    }
  };
  await Promise.all([...loggedIn.map(memberLoop), ...execs.map(execLoop), burstLoop(), progress()]);

  // ── Phase 4: the desk closes every round ──
  for (const k of keys) await desk.action(ACTION.closeVoting, "closeVoting", [{ key: k }]);
  await finish("completed");
}

function report() {
  const lines: string[] = [];
  lines.push(`# Session stress test`, ``, `Target ${BASE} · ${new Date().toISOString()} · ${N_EXECS} execs, ${N_JUNIORS} juniors, ${N_SENIORS} seniors, ${N_COUNTRIES} countries, ${MINUTES} min`, ``);
  lines.push(`| Operation | Count | Errors | p50 ms | p95 ms | Max ms |`, `| --- | ---: | ---: | ---: | ---: | ---: |`);
  for (const [label, s] of [...metrics].sort((a, b) => a[0].localeCompare(b[0]))) {
    const ms = s.map((x) => x.ms);
    lines.push(`| ${label} | ${s.length} | ${s.filter((x) => !x.ok).length} | ${Math.round(pct(ms, 50))} | ${Math.round(pct(ms, 95))} | ${Math.round(Math.max(...ms))} |`);
  }
  const total = [...metrics.values()].reduce((n, s) => n + s.length, 0);
  const bad = [...metrics.values()].reduce((n, s) => n + s.filter((x) => !x.ok).length, 0);
  lines.push(``, `Total requests ${total}, errors ${bad} (${total ? ((100 * bad) / total).toFixed(2) : 0}%).`, ``);
  lines.push(`Realtime: ${rt.events} broadcast events received; lag p50 ${Math.round(pct(rt.lagMs, 50))} ms, p95 ${Math.round(pct(rt.lagMs, 95))} ms (server clock to client clock, so approximate).`);
  for (const b of rt.bursts) lines.push(`Burst ${b.label}: ${b.votesOk} votes accepted; each desk received ${b.received.join(" / ")} events for that round within ${Math.round(b.window / 1000)} s (expected about ${b.expectedPerExec}).`);
  if (errors.length) lines.push(``, `## First errors`, ``, ...errors.map((e) => `- ${e}`));
  const text = lines.join("\n");
  console.log("\n" + text);
  const file = `scripts/stress/report-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`;
  writeFileSync(file, text + "\n");
  console.log(`\nreport written to ${file}`);
}

main().catch(async (e) => {
  console.error("stress test failed:", e);
  process.exit(1);
});
