// Shared by api/plays.js and api/report.js (files starting with _ are not public routes).
// The play record is sanitised here: only known fields, capped sizes, only known values.

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const HASH = "pp:plays:v1";
export const hasDb = () => Boolean(URL_ && TOKEN);

const ID = /^[a-z]_[a-z0-9]{6,40}$/;
const SLUG = /^[a-z0-9-]{1,40}$/;
const DEVICES = new Set(["phone", "tablet", "desktop"]);
// Keep these in step with AGE_BANDS and GENDERS in src/game/config.js.
const AGES = new Set(["u18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "na"]);
const GENDERS = new Set(["woman", "man", "nonbinary", "na"]);

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v, max = 1e7) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : 0);
const iso = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const slug = (v) => (typeof v === "string" && SLUG.test(v) ? v : null);

// Keep only the fields the researcher view uses, with sizes capped. Returns null if the record is unusable.
// v2 is the October flow (picks are lists per deck). v1 records from the first version are still accepted and kept as sent.
export function sanitise(r) {
  if (!r || typeof r !== "object" || typeof r.id !== "string" || !ID.test(r.id) || typeof r.pid !== "string" || !ID.test(r.pid)) return null;
  const startedAt = iso(r.startedAt);
  if (!startedAt) return null;
  return r.v === 2 ? sanitiseV2(r, startedAt) : sanitiseV1(r, startedAt);
}

const player = (p) => ({
  name: [...str(p?.name, 40)].filter((ch) => ch > "\u001f" && ch !== "\u007f" && ch !== "<" && ch !== ">").join("").replace(/\s+/g, " ").trim(),
  age: AGES.has(p?.age) ? p.age : "",
  gender: GENDERS.has(p?.gender) ? p.gender : "",
  email: cleanEmail(p?.email),
});
const group = (g) => str(g, 24).replace(/[^\w -]/g, "").trim();
const durations = (d = {}) => ({ discover: num(d.discover), assemble: num(d.assemble), imagine: num(d.imagine), describe: num(d.describe), total: num(d.total) });
const scale = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
const LIMITS = { issue: 1, forces: 1, value: 2, methods: 1, places: 3 };
const STATUS2 = new Set(["started", "discover", "assemble", "imagine", "describe", "completed"]);
const ANSWER_IDS = new Set(["experience-1", "experience-2", "experience-3", "arrangement-1", "arrangement-2", "arrangement-3", "tensions-1", "tensions-2", "tensions-3"]);
const NUDGES = new Set(["Reverse an assumption", "Make the idea more radical"]);

function sanitiseV2(r, startedAt) {
  const picks = {};
  for (const [k, max] of Object.entries(LIMITS)) picks[k] = (Array.isArray(r.picks?.[k]) ? r.picks[k] : []).map(slug).filter(Boolean).slice(0, max);
  const answers = {};
  for (const id of ANSWER_IDS) { const t = str(r.answers?.[id], 800).trim(); if (t) answers[id] = t; }
  const st = r.stats || {};
  return {
    v: 2,
    id: r.id,
    pid: r.pid,
    group: group(r.group),
    player: player(r.player),
    survey: { pre: scale(r.survey?.pre), post: scale(r.survey?.post), feedback: str(r.survey?.feedback, 1000).trim() },
    status: STATUS2.has(r.status) ? r.status : "started",
    startedAt,
    completedAt: iso(r.completedAt),
    picks,
    challenge: picks.issue[0] ?? null,
    sentence: str(r.sentence, 600),
    answers,
    nudges: (Array.isArray(r.nudges) ? r.nudges : []).filter((n) => NUDGES.has(n?.text)).slice(0, 2).map((n) => ({ text: n.text, answer: str(n.answer, 800).trim() })),
    details: str(r.details, 800).trim(),
    scenario: { title: str(r.scenario?.title, 120), idea: str(r.scenario?.idea, 400), difference: str(r.scenario?.difference, 400) },
    edited: (Array.isArray(r.edited) ? r.edited : []).filter((f) => ["title", "idea", "difference"].includes(f)),
    stats: { mode: ["random", "choose", "explore"].includes(st.mode) ? st.mode : "", draws: num(st.draws, 1000), swaps: num(st.swaps, 1000), locks: num(st.locks, 1000), clarified: num(st.clarified, 1000), versions: num(st.versions, 1000), regenerated: num(st.regenerated, 1000), ai: num(st.ai, 1000) },
    aiFields: (Array.isArray(r.aiFields) ? r.aiFields : []).filter((f) => ["title", "idea", "difference"].includes(f)),
    durations: durations(r.durations),
    device: DEVICES.has(r.device) ? r.device : "desktop",
  };
}

function sanitiseV1(r, startedAt) {
  const picks = {};
  for (const k of ["forces", "value", "methods", "places"]) { const s = slug(r.picks?.[k]); if (s) picks[k] = s; }
  const d = r.durations || {};
  return {
    v: 1,
    id: r.id,
    pid: r.pid,
    group: group(r.group),
    player: player(r.player),
    status: ["started", "challenge", "blanks", "questions", "completed"].includes(r.status) ? r.status : "started",
    startedAt,
    completedAt: iso(r.completedAt),
    challenge: slug(r.challenge),
    picks,
    swaps: num(r.swaps, 1000),
    draws: num(r.draws, 1000),
    pickLog: [],
    questions: Array.isArray(r.questions) ? r.questions.slice(0, 8).map((q) => ({ id: str(q?.id, 24), angle: str(q?.angle, 60), text: str(q?.text, 400), answer: str(q?.answer, 2000) })) : [],
    prompt: str(r.prompt, 2000),
    durations: { challenge: num(d.challenge), blanks: num(d.blanks), questions: num(d.questions), total: num(d.total) },
    device: DEVICES.has(r.device) ? r.device : "desktop",
  };
}

export async function redis(...command) {
  const res = await fetch(URL_, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(command) });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).result;
}

export const EMAIL = /^[^\s@<>"',;]{1,64}@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
export const cleanEmail = (v) => (typeof v === "string" && v.trim().length <= 120 && EMAIL.test(v.trim()) ? v.trim().toLowerCase() : "");
