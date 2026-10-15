// Shared by api/plays.js and api/report.js (files starting with _ are not public routes).
// The play record is sanitised here: only known fields, capped sizes, only known values.

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const HASH = "pp:plays:v1";
export const hasDb = () => Boolean(URL_ && TOKEN);

const ID = /^[a-z]_[a-z0-9]{6,40}$/;
const SLUG = /^[a-z0-9-]{1,40}$/;
const STATUS = new Set(["started", "challenge", "blanks", "questions", "completed"]);
const DEVICES = new Set(["phone", "tablet", "desktop"]);
// Keep these in step with AGE_BANDS and GENDERS in src/game/config.js.
const AGES = new Set(["u18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "na"]);
const GENDERS = new Set(["woman", "man", "nonbinary", "na"]);

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v, max = 1e7) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), max) : 0);
const iso = (v) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const slug = (v) => (typeof v === "string" && SLUG.test(v) ? v : null);

// Keep only the fields the researcher view uses, with sizes capped. Returns null if the record is unusable.
export function sanitise(r) {
  if (!r || typeof r !== "object" || typeof r.id !== "string" || !ID.test(r.id) || typeof r.pid !== "string" || !ID.test(r.pid)) return null;
  const startedAt = iso(r.startedAt);
  if (!startedAt) return null;
  const picks = {};
  for (const k of ["forces", "value", "methods", "places"]) { const s = slug(r.picks?.[k]); if (s) picks[k] = s; }
  const d = r.durations || {};
  return {
    v: 1,
    id: r.id,
    pid: r.pid,
    group: str(r.group, 24).replace(/[^\w -]/g, "").trim(),
    player: {
      name: [...str(r.player?.name, 40)].filter((ch) => ch > "\u001f" && ch !== "\u007f" && ch !== "<" && ch !== ">").join("").replace(/\s+/g, " ").trim(),
      age: AGES.has(r.player?.age) ? r.player.age : "",
      gender: GENDERS.has(r.player?.gender) ? r.player.gender : "",
      email: cleanEmail(r.player?.email),
    },
    status: STATUS.has(r.status) ? r.status : "started",
    startedAt,
    completedAt: iso(r.completedAt),
    challenge: slug(r.challenge),
    picks,
    swaps: num(r.swaps, 1000),
    draws: num(r.draws, 1000),
    pickLog: Array.isArray(r.pickLog)
      ? r.pickLog.slice(0, 80).map((e) => ({ s: str(e?.s, 12), c: slug(e?.c), t: num(e?.t), a: e?.a ? 1 : 0 }))
      : [],
    questions: Array.isArray(r.questions)
      ? r.questions.slice(0, 8).map((q) => ({ id: str(q?.id, 24), angle: str(q?.angle, 60), text: str(q?.text, 400), answer: str(q?.answer, 2000) }))
      : [],
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
