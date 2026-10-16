// Wording help from Gemini for the game.
//   GET  /api/ai   -> { enabled }          (so the game knows whether to offer it)
//   POST /api/ai   { task: "clarify" | "describe", picks, answers, details, nudges, field?, keep?, avoid?, n? }
// Answers 503 when no key is set, 429 over the limits, 502 when Gemini or a check fails; the game then uses its own wording.

import { aiEnabled, runTask } from "./_ai.js";
import { redis, hasDb } from "./_play.js";
import { SLOTS } from "../src/game/config.js";

const json = (res, status, body) => { res.setHeader("cache-control", "no-store"); res.status(status).json(body); };

const PER_IP_HOUR = Number(process.env.AI_PER_IP_HOUR || 120);
const PER_DAY = Number(process.env.AI_DAILY_LIMIT || 1000);
const mem = new Map();   // used only when there is no database

async function underLimits(ip) {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13), day = now.toISOString().slice(0, 10);
  if (hasDb()) {
    const [h, d] = await Promise.all([redis("INCR", `pp:ai:ip:${ip}:${hour}`), redis("INCR", `pp:ai:day:${day}`)]);
    if (h === 1) redis("EXPIRE", `pp:ai:ip:${ip}:${hour}`, 3700).catch(() => {});
    if (d === 1) redis("EXPIRE", `pp:ai:day:${day}`, 90000).catch(() => {});
    return h <= PER_IP_HOUR && d <= PER_DAY;
  }
  const k = `${ip}:${hour}`; const n = (mem.get(k) || 0) + 1; mem.set(k, n);
  if (mem.size > 5000) mem.clear();
  return n <= PER_IP_HOUR;
}

export default async function handler(req, res) {
  if (req.method === "GET") return json(res, 200, { enabled: aiEnabled() });
  if (req.method !== "POST") { res.setHeader("allow", "GET, POST"); return json(res, 405, { error: "Method not allowed." }); }
  if (!aiEnabled()) return json(res, 503, { error: "AI wording is not switched on." });

  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || JSON.stringify(body).length > 12000 || !["clarify", "describe"].includes(body.task)) return json(res, 400, { error: "Invalid request." });
    // only known ids, as arrays, within each slot's limit
    const picks = Object.fromEntries(SLOTS.map((s) => [s.key, (Array.isArray(body.picks?.[s.key]) ? body.picks[s.key] : []).filter((id) => typeof id === "string" && /^[a-z0-9-]{1,40}$/.test(id)).slice(0, s.max)]));
    body.picks = picks;
    if (!picks.issue?.length || !picks.methods?.length) return json(res, 400, { error: "Choose an issue and a method first." });

    const ip = String(req.headers["x-forwarded-for"] || "local").split(",")[0].trim().slice(0, 64);
    if (!(await underLimits(ip))) return json(res, 429, { error: "Too many requests for now." });

    const result = await runTask(body.task, body);
    return json(res, 200, result);
  } catch (e) {
    console.error("ai failed:", e?.message);
    return json(res, 502, { error: "The AI could not help this time.", why: String(e?.message || "").replace(/[^\w .:-]/g, "").slice(0, 80) });
  }
}
