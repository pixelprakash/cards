// Metrics for the researcher view. Pure functions over an array of play records (see src/game/store.js and api/_play.js).
// Card and hand metrics use finished plays; the funnel and the counts use every play.
// Records from the first version of the game (v1) are converted by normalize() so old plays still count.

import { DECKS, cardOf } from "../game/cards.js";
import { SLOTS, GROUPS, AGE_BANDS, GENDERS } from "../game/config.js";

const cardOptions = (deck) => DECKS[deck].cards.map((c) => ({ id: c.id, title: c.name }));
const bands = (list) => list.map((x) => ({ id: x.id, title: x.label }));

// Everything a play can be broken down by. `get` returns the list of values a play has for it.
export const DIMENSIONS = [
  ...SLOTS.map((s) => ({ key: s.key, label: s.label, card: true, options: () => cardOptions(s.deck), get: (p) => p.picks?.[s.key] ?? [] })),
  { key: "age", label: "Age", options: () => bands(AGE_BANDS), get: (p) => (p.player?.age ? [p.player.age] : []) },
  { key: "gender", label: "Gender", options: () => bands(GENDERS), get: (p) => (p.player?.gender ? [p.player.gender] : []) },
];
export const dimension = (key) => DIMENSIONS.find((d) => d.key === key);
export const CARD_DIMENSIONS = DIMENSIONS.filter((d) => d.card);

// ---- v1 -> v2 shape
export function normalize(p) {
  if (p.v === 2) return p;
  const one = (x) => (x ? [x] : []);
  return {
    ...p, v: 2, legacy: true,
    picks: { issue: one(p.challenge), forces: one(p.picks?.forces), value: one(p.picks?.value), methods: one(p.picks?.methods), places: one(p.picks?.places) },
    survey: { pre: null, post: null, feedback: "" },
    answers: {}, nudges: [], scenario: { title: "", idea: p.prompt ?? "", difference: "" },
    stats: { mode: "", draws: p.draws ?? 0, swaps: p.swaps ?? 0, locks: 0, clarified: 0, versions: 1, regenerated: 0 },
    durations: { discover: 0, assemble: p.durations?.blanks ?? 0, imagine: p.durations?.questions ?? 0, describe: 0, total: p.durations?.total ?? 0 },
    status: p.status === "completed" ? "completed" : p.status === "questions" ? "imagine" : p.status === "blanks" ? "assemble" : "started",
  };
}

const isComplete = (p) => p.status === "completed";
const hasHand = (p) => p.picks.issue.length > 0 && p.picks.methods.length > 0;
export const handKey = (p) => SLOTS.map((s) => [...p.picks[s.key]].sort().join("+")).join("|");
export const handLabel = (p) => SLOTS.flatMap((s) => p.picks[s.key].map((id) => cardOf(s.deck, id)?.name ?? id));

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const share = (n, d) => (d ? n / d : null);
const dayOf = (iso) => iso.slice(0, 10);
const nonEmpty = (s) => (s ?? "").trim().length > 0;
const answersOf = (p) => Object.values(p.answers ?? {}).filter(nonEmpty).length;

export function filterPlays(plays, { days = 0, challenge = "", group = "", age = "", gender = "" } = {}) {
  const since = days ? Date.now() - days * 864e5 : 0;
  return plays.filter((p) =>
    (!since || new Date(p.startedAt).getTime() >= since) &&
    (!challenge || p.picks.issue.includes(challenge)) &&
    (!group || (p.group || "") === group) &&
    (!age || p.player?.age === age) &&
    (!gender || p.player?.gender === gender));
}

export function computeMetrics(all) {
  const done = all.filter(isComplete);
  const total = all.length;
  const players = new Set(all.map((p) => p.pid));
  const groups = [...new Set(all.map((p) => p.group).filter(Boolean))].sort();

  // hands explored (finished plays)
  const handCounts = new Map();
  for (const p of done) if (hasHand(p)) handCounts.set(handKey(p), (handCounts.get(handKey(p)) || 0) + 1);
  const topHands = [...handCounts].map(([k, count]) => ({ key: k, count, labels: handLabel(done.find((p) => handKey(p) === k)) })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const issues = cardOptions("issue").map((c) => {
    const mine = all.filter((p) => p.picks.issue.includes(c.id));
    return { id: c.id, title: c.title, count: mine.length, completed: mine.filter(isComplete).length };
  });

  const cardPicks = Object.fromEntries(CARD_DIMENSIONS.filter((d) => d.key !== "issue").map((d) => [d.key, d.options().map((c) => ({ id: c.id, title: c.title, count: done.filter((p) => d.get(p).includes(c.id)).length })).sort((a, b) => b.count - a.count)]));

  const funnel = [
    { step: "Started", count: total },
    { step: "Chose an issue and a method", count: all.filter(hasHand).length },
    { step: "Reached the questions", count: all.filter((p) => ["imagine", "describe", "completed"].includes(p.status) && hasHand(p)).length },
    { step: "Wrote a scenario", count: all.filter((p) => ["describe", "completed"].includes(p.status) && nonEmpty(p.scenario?.title)).length },
    { step: "Finished and saved", count: done.length },
  ];

  const byDay = new Map();
  for (const p of all) {
    const d = dayOf(p.startedAt);
    const row = byDay.get(d) || { day: d, started: 0, completed: 0 };
    row.started += 1;
    if (isComplete(p)) row.completed += 1;
    byDay.set(d, row);
  }
  const perDay = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  const totals = done.map((p) => p.durations?.total).filter((n) => n > 0).sort((a, b) => a - b);
  const stepMedian = (k) => quantile(done.map((p) => p.durations?.[k]).filter((n) => n > 0).sort((a, b) => a - b), 0.5);
  const edges = [0, 1, 2, 3, 5, 8, 12, 20, Infinity].map((m) => m * 60000);
  const bins = edges.slice(0, -1).map((from, i) => ({ from, to: edges[i + 1], count: totals.filter((t) => t >= from && t < edges[i + 1]).length }));

  const fresh = done.filter((p) => !p.legacy);
  const modes = ["random", "choose", "explore"].map((m) => ({ mode: m, count: fresh.filter((p) => p.stats.mode === m).length }));
  const engagement = {
    avgDraws: mean(fresh.map((p) => p.stats.draws)),
    avgSwaps: mean(fresh.map((p) => p.stats.swaps)),
    lockedRate: share(fresh.filter((p) => p.stats.locks > 0).length, fresh.length),
    clarifiedRate: share(fresh.filter((p) => p.stats.clarified > 0).length, fresh.length),
    versionsRate: share(fresh.filter((p) => p.stats.versions > 1).length, fresh.length),
    avgAnswers: mean(fresh.map(answersOf)),
    answeredAny: share(fresh.filter((p) => answersOf(p) > 0).length, fresh.length),
    editedRate: share(fresh.filter((p) => p.edited.length > 0).length, fresh.length),
    regeneratedRate: share(fresh.filter((p) => p.stats.regenerated > 0).length, fresh.length),
    aiRate: share(fresh.filter((p) => (p.stats.ai || 0) > 0).length, fresh.length),
    detailsRate: share(fresh.filter((p) => nonEmpty(p.details)).length, fresh.length),
    avgValues: mean(fresh.map((p) => p.picks.value.length)),
    avgPlaces: mean(fresh.map((p) => p.picks.places.length)),
  };

  const rating = (key) => {
    const vals = all.map((p) => p.survey?.[key]).filter((n) => Number.isInteger(n));
    return { n: vals.length, mean: mean(vals), counts: [1, 2, 3, 4, 5].map((r) => ({ rating: r, count: vals.filter((v) => v === r).length })) };
  };
  const survey = { pre: rating("pre"), post: rating("post"), feedback: all.filter((p) => nonEmpty(p.survey?.feedback)).length };

  const who = (key) => dimension(key).options().map((o) => {
    const mine = all.filter((p) => dimension(key).get(p).includes(o.id));
    return { id: o.id, title: o.title, count: mine.length, completed: mine.filter(isComplete).length };
  });
  const devices = ["phone", "tablet", "desktop"].map((d) => ({ device: d, count: all.filter((p) => p.device === d).length })).filter((d) => d.count);

  return {
    totals: { started: total, completed: done.length, completionRate: share(done.length, total), players: players.size, groups },
    hands: { unique: handCounts.size, top: topHands },
    issues, cardPicks, funnel, perDay,
    time: { median: quantile(totals, 0.5), p25: quantile(totals, 0.25), p75: quantile(totals, 0.75), bins, steps: { discover: stepMedian("discover"), assemble: stepMedian("assemble"), imagine: stepMedian("imagine"), describe: stepMedian("describe") } },
    engagement, modes, survey, devices,
    who: { age: who("age"), gender: who("gender"), named: all.filter((p) => p.player?.name).length, emails: all.filter((p) => p.player?.email).length, profiled: all.filter((p) => p.player?.age || p.player?.gender).length },
  };
}

// Finished plays that have a hand, counted for each pair of values (a play counts once per pair it contains).
export function crossTab(all, rowDim, colDim) {
  const done = all.filter((p) => isComplete(p) && hasHand(p));
  const R = dimension(rowDim), C = dimension(colDim);
  const rows = R.options(), cols = C.options();
  const cells = rows.map((r) => cols.map((c) => done.filter((p) => R.get(p).includes(r.id) && C.get(p).includes(c.id)).length));
  return { rows, cols, cells, max: Math.max(0, ...cells.flat()), total: done.length };
}

// ---- export
const ageLabel = (id) => AGE_BANDS.find((a) => a.id === id)?.label ?? "";
const genderLabel = (id) => GENDERS.find((g) => g.id === id)?.label ?? "";
const names = (p, key) => p.picks[key].map((id) => cardOf(SLOTS.find((s) => s.key === key).deck, id)?.name ?? id).join("; ");
const ANSWER_COLS = GROUPS.flatMap((g) => g.qs.map((q, i) => ({ id: `${g.key}-${i + 1}`, q })));

export function toCSV(plays) {
  const head = ["id", "player", "name", "email", "age_band", "gender", "group", "status", "started_at", "completed_at", "device", "how_cards_were_chosen", "issue", "force", "values", "method", "places", "sentence", "title", "idea", "difference", "own_details", "draws", "swaps", "locks", "made_clearer", "versions", "regenerated", "ai_calls", "edited_parts", "total_seconds", "discover_seconds", "assemble_seconds", "imagine_seconds", "describe_seconds", "ease_before_1to5", "helped_after_1to5", "feedback", ...ANSWER_COLS.map((a) => `answer_${a.id}`), "nudges"];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const sec = (ms) => (ms ? Math.round(ms / 100) / 10 : "");
  const rows = plays.map((p) => [
    p.id, p.pid, p.player?.name, p.player?.email, ageLabel(p.player?.age), genderLabel(p.player?.gender), p.group, p.status, p.startedAt, p.completedAt, p.device, p.stats.mode,
    names(p, "issue"), names(p, "forces"), names(p, "value"), names(p, "methods"), names(p, "places"), p.sentence, p.scenario?.title, p.scenario?.idea, p.scenario?.difference, p.details,
    p.stats.draws, p.stats.swaps, p.stats.locks, p.stats.clarified, p.stats.versions, p.stats.regenerated, p.stats.ai ?? 0, (p.edited || []).join("; "),
    sec(p.durations?.total), sec(p.durations?.discover), sec(p.durations?.assemble), sec(p.durations?.imagine), sec(p.durations?.describe),
    p.survey?.pre, p.survey?.post, p.survey?.feedback, ...ANSWER_COLS.map((a) => p.answers?.[a.id] ?? ""), (p.nudges || []).map((n) => `${n.text}: ${n.answer}`).join(" | "),
  ].map(q).join(","));
  return [head.join(","), ...rows].join("\n");
}

// ---- sample data (clearly labelled in the UI; never mixed with real plays)
export function samplePlays(n = 180) {
  let s = 20260301;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pickIds = (deck, count, bias = 0) => {
    const ids = DECKS[deck].cards.map((c) => c.id);
    const out = [];
    while (out.length < count) { const i = Math.floor(Math.pow(rnd(), 1 + bias) * ids.length); if (!out.includes(ids[i])) out.push(ids[i]); }
    return out;
  };
  const day = 864e5, now = Date.now();
  const STAGES = ["started", "discover", "assemble", "imagine", "describe", "completed"];
  return Array.from({ length: n }, (_, i) => {
    const started = new Date(now - rnd() * 21 * day);
    const r = rnd();
    const stage = r < 0.06 ? 0 : r < 0.12 ? 1 : r < 0.2 ? 2 : r < 0.28 ? 3 : r < 0.34 ? 4 : 5;
    const status = STAGES[stage];
    const picks = stage >= 2 ? { issue: pickIds("issue", 1, 0.6), forces: rnd() < 0.8 ? pickIds("forces", 1) : [], value: pickIds("value", 1 + Math.floor(rnd() * 2), 0.4), methods: pickIds("methods", 1, 0.5), places: pickIds("places", 1 + Math.floor(rnd() * 3)) } : { issue: [], forces: [], value: [], methods: [], places: [] };
    const total = Math.round((120 + rnd() * 600) * 1000);
    const answered = stage >= 4 && rnd() < 0.6;
    const finished = stage === 5;
    return {
      v: 2, id: `p_sample${i}`, pid: `u_sample${Math.floor(rnd() * 90)}`, group: rnd() < 0.35 ? ["delhi-a", "delhi-b", "course-1"][Math.floor(rnd() * 3)] : "",
      player: { name: "", email: "", age: AGE_BANDS[Math.floor(rnd() * (AGE_BANDS.length - 1))].id, gender: rnd() < 0.08 ? "na" : GENDERS[Math.floor(rnd() * 3)].id },
      survey: { pre: rnd() < 0.8 ? 1 + Math.floor(rnd() * 5) : null, post: finished && rnd() < 0.7 ? 2 + Math.floor(rnd() * 4) : null, feedback: finished && rnd() < 0.2 ? "Sample feedback text." : "" },
      status, startedAt: started.toISOString(), completedAt: finished ? new Date(started.getTime() + total).toISOString() : null,
      picks, challenge: picks.issue[0] ?? null, sentence: stage >= 3 ? "Sample sentence." : "",
      answers: answered ? { "experience-1": "Sample answer." } : {}, nudges: [], details: "",
      scenario: stage >= 4 ? { title: "Sample title", idea: "Sample idea.", difference: "Sample difference." } : { title: "", idea: "", difference: "" },
      edited: finished && rnd() < 0.3 ? ["idea"] : [],
      stats: { mode: ["random", "choose", "explore"][Math.floor(rnd() * 3)], draws: Math.floor(rnd() * 3), swaps: Math.floor(rnd() * 4), locks: rnd() < 0.2 ? 1 : 0, clarified: rnd() < 0.35 ? 1 : 0, versions: rnd() < 0.3 ? 2 : 1, regenerated: rnd() < 0.3 ? 1 : 0 },
      durations: finished ? { discover: total * 0.1, assemble: total * 0.35, imagine: total * 0.3, describe: total * 0.25, total } : {},
      device: ["phone", "phone", "desktop", "tablet"][Math.floor(rnd() * 4)],
    };
  });
}
