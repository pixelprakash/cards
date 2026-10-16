// Recording plays. Every play is saved in this browser; if the shared database is connected (see api/plays.js)
// it is also sent there, so a researcher sees every player. A play carries the player's optional name, age band and
// gender (asked at the start of the game) next to a random browser id.
// Record v2 (October brief): picks are lists per deck; the scenario is the three parts the player finished with.

import { emptySelection } from "./sentence.js";

const LOCAL = "pp.plays.v2";
const PID = "pp.pid";
const ENDPOINT = "/api/plays";

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function playerId() {
  try {
    let id = localStorage.getItem(PID);
    if (!id) { id = uid("u"); localStorage.setItem(PID, id); }
    return id;
  } catch { return "u_private"; }
}

export const cleanPlayer = (p = {}) => ({
  name: String(p.name ?? "").replace(/\s+/g, " ").trim().slice(0, 40),
  age: String(p.age ?? ""),
  gender: String(p.gender ?? ""),
  email: String(p.email ?? "").trim().toLowerCase().slice(0, 120),
});

export const newPlay = (group = "", player = {}, survey = {}) => ({
  v: 2,
  id: uid("p"),
  pid: playerId(),
  group: group.trim().slice(0, 24),
  player: cleanPlayer(player),
  survey: { pre: survey.pre ?? null, post: null, feedback: "" },
  status: "started",
  startedAt: new Date().toISOString(),
  completedAt: null,
  picks: emptySelection(),
  answers: {},
  nudges: [],
  details: "",
  scenario: { title: "", idea: "", difference: "" },
  edited: [],
  stats: { mode: "", draws: 0, swaps: 0, locks: 0, clarified: 0, versions: 1, regenerated: 0 },
  pickLog: [],
  durations: {},
  device: innerWidth < 640 ? "phone" : innerWidth < 1024 ? "tablet" : "desktop",
});

export function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL)) || []; } catch { return []; }
}

function writeLocal(list) {
  try { localStorage.setItem(LOCAL, JSON.stringify(list.slice(-500))); } catch { /* storage blocked: kept in memory only */ }
}

let remoteOk = null;   // null = unknown, false = not connected
const timers = new Map();

async function send(play, { beacon = false } = {}) {
  if (remoteOk === false) return;
  const body = JSON.stringify(play);
  try {
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" })); return; }
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
    remoteOk = res.ok ? true : res.status === 404 || res.status === 503 ? false : remoteOk;
  } catch { /* offline: the local copy remains */ }
}

// Upsert by id; the remote copy follows shortly after (debounced), or immediately with { now: true }.
export function save(play, { now = false, beacon = false } = {}) {
  const list = loadLocal();
  const at = list.findIndex((p) => p.id === play.id);
  if (at >= 0) list[at] = play; else list.push(play);
  writeLocal(list);
  clearTimeout(timers.get(play.id));
  if (now || beacon) send(play, { beacon });
  else timers.set(play.id, setTimeout(() => send(play), 900));
}

export function clearLocal() { try { localStorage.removeItem(LOCAL); } catch { /* ignore */ } }
