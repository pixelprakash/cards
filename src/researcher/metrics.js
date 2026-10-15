// Metrics for the researcher view. Pure functions over an array of play records (see src/game/store.js).
// Card and combination metrics use completed plays; the funnel and counts use every play.

import { DECKS, titleOf } from "../cards-data.js";
import { SLOTS, CHALLENGE_DECK, AGE_BANDS, GENDERS } from "../game/config.js";

const baseCards = (deck) => DECKS[deck].cards.filter((c) => !c.mine);
const cardTitle = (deck, id) => {
  const c = DECKS[deck].cards.find((x) => x.id === id);
  return c ? titleOf(c) : id ?? "none";
};

const cardOptions = (deck) => baseCards(deck).map((c) => ({ id: c.id, title: titleOf(c) }));
const bandOptions = (list) => list.map((x) => ({ id: x.id, title: x.label }));

// Everything a player can be broken down by. `get` reads the value from a play; `options` lists the possible values.
export const DIMENSIONS = [
  { key: "challenge", label: "Challenge", get: (p) => p.challenge, options: () => cardOptions(CHALLENGE_DECK), played: true },
  ...SLOTS.map((s) => ({ key: s.key, label: s.label, get: (p) => p.picks?.[s.key], options: () => cardOptions(s.deck), played: true })),
  { key: "age", label: "Age", get: (p) => p.player?.age || "", options: () => bandOptions(AGE_BANDS) },
  { key: "gender", label: "Gender", get: (p) => p.player?.gender || "", options: () => bandOptions(GENDERS) },
];
export const dimension = (key) => DIMENSIONS.find((d) => d.key === key);
export const valueOf = (p, key) => dimension(key).get(p);

export const possibleCombinations = () => [CHALLENGE_DECK, ...SLOTS.map((s) => s.deck)].reduce((n, d) => n * baseCards(d).length, 1);
export const comboKey = (p) => [p.challenge, ...SLOTS.map((s) => p.picks?.[s.key])].join("|");
export const comboLabel = (key) => key.split("|").map((id, i) => cardTitle(i === 0 ? CHALLENGE_DECK : SLOTS[i - 1].deck, id));

const isComplete = (p) => p.status === "completed";
const hasAllPicks = (p) => !!p.challenge && SLOTS.every((s) => p.picks?.[s.key]);

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const dayOf = (iso) => iso.slice(0, 10);

export function filterPlays(plays, { days = 0, challenge = "", group = "", age = "", gender = "" } = {}) {
  const since = days ? Date.now() - days * 864e5 : 0;
  return plays.filter((p) =>
    (!since || new Date(p.startedAt).getTime() >= since) &&
    (!challenge || p.challenge === challenge) &&
    (!group || (p.group || "") === group) &&
    (!age || p.player?.age === age) &&
    (!gender || p.player?.gender === gender));
}

export function computeMetrics(all) {
  const done = all.filter(isComplete);
  const total = all.length;

  // ---- counts
  const players = new Set(all.map((p) => p.pid));
  const groups = [...new Set(all.map((p) => p.group).filter(Boolean))].sort();

  // ---- combinations (completed plays)
  const comboCounts = new Map();
  for (const p of done) if (hasAllPicks(p)) comboCounts.set(comboKey(p), (comboCounts.get(comboKey(p)) || 0) + 1);
  const topCombos = [...comboCounts].map(([key, count]) => ({ key, count, labels: comboLabel(key) })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const possible = possibleCombinations();

  // ---- challenges chosen (every play that reached the choice)
  const challenges = baseCards(CHALLENGE_DECK).map((c) => {
    const mine = all.filter((p) => p.challenge === c.id);
    return { id: c.id, title: titleOf(c), count: mine.length, completed: mine.filter(isComplete).length };
  });

  // ---- card popularity per deck (final picks of completed plays)
  const cardPicks = Object.fromEntries(SLOTS.map((s) => [s.key, baseCards(s.deck).map((c) => ({ id: c.id, title: titleOf(c), count: done.filter((p) => p.picks?.[s.key] === c.id).length })).sort((a, b) => b.count - a.count)]));

  // ---- funnel (every play)
  const funnel = [
    { step: "Pressed start", count: total },
    { step: "Chose a challenge", count: all.filter((p) => p.challenge).length },
    { step: "Filled all four blanks", count: all.filter(hasAllPicks).length },
    { step: "Reached the questions", count: all.filter((p) => p.questions?.length).length },
    { step: "Finished the game", count: done.length },
  ];

  // ---- plays per day
  const byDay = new Map();
  for (const p of all) {
    const d = dayOf(p.startedAt);
    const row = byDay.get(d) || { day: d, started: 0, completed: 0 };
    row.started += 1;
    if (isComplete(p)) row.completed += 1;
    byDay.set(d, row);
  }
  const perDay = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  // ---- time
  const totals = done.map((p) => p.durations?.total).filter((n) => n > 0).sort((a, b) => a - b);
  const stepMedian = (k) => quantile(done.map((p) => p.durations?.[k]).filter((n) => n > 0).sort((a, b) => a - b), 0.5);
  const edges = [0, 1, 2, 3, 5, 8, 12, 20, Infinity].map((m) => m * 60000);
  const bins = edges.slice(0, -1).map((from, i) => ({ from, to: edges[i + 1], count: totals.filter((t) => t >= from && t < edges[i + 1]).length }));

  // ---- engagement (completed plays)
  const answeredShare = done.map((p) => (p.questions?.length ? p.questions.filter((q) => (q.answer || "").trim()).length / p.questions.length : 0));
  const answerChars = done.flatMap((p) => (p.questions || []).map((q) => (q.answer || "").trim().length).filter((n) => n > 0));
  const prompts = done.map((p) => (p.prompt || "").trim().length);
  const engagement = {
    avgSwaps: mean(done.map((p) => p.swaps || 0)),
    avgDraws: mean(done.map((p) => p.draws || 0)),
    answeredRate: mean(answeredShare),
    avgAnswerChars: mean(answerChars),
    promptRate: done.length ? prompts.filter((n) => n > 0).length / done.length : null,
    avgPromptChars: mean(prompts.filter((n) => n > 0)),
  };

  const who = (key) => dimension(key).options().map((o) => {
    const mine = all.filter((p) => valueOf(p, key) === o.id);
    return { id: o.id, title: o.title, count: mine.length, completed: mine.filter(isComplete).length };
  });
  const withName = all.filter((p) => p.player?.name).length;
  const emails = all.filter((p) => p.player?.email).length;
  const asked = all.filter((p) => p.player?.age || p.player?.gender).length;

  const devices = ["phone", "tablet", "desktop"].map((d) => ({ device: d, count: all.filter((p) => p.device === d).length })).filter((d) => d.count);

  return {
    totals: { started: total, completed: done.length, completionRate: total ? done.length / total : null, players: players.size, groups },
    combos: { unique: comboCounts.size, possible, coverage: possible ? comboCounts.size / possible : 0, top: topCombos },
    challenges, cardPicks, funnel, perDay,
    time: { median: quantile(totals, 0.5), p25: quantile(totals, 0.25), p75: quantile(totals, 0.75), bins, steps: { challenge: stepMedian("challenge"), blanks: stepMedian("blanks"), questions: stepMedian("questions") } },
    engagement, devices,
    who: { age: who("age"), gender: who("gender"), named: withName, emails, profiled: asked },
  };
}

// Counts of finished plays for two dimensions, e.g. challenge x method, or age x challenge.
export function crossTab(all, rowDim, colDim) {
  const done = all.filter((p) => isComplete(p) && hasAllPicks(p));
  const rows = dimension(rowDim).options(), cols = dimension(colDim).options();
  const cells = rows.map((r) => cols.map((c) => done.filter((p) => valueOf(p, rowDim) === r.id && valueOf(p, colDim) === c.id).length));
  return { rows, cols, cells, max: Math.max(0, ...cells.flat()), total: done.length };
}

// ---- export
const ageLabel = (id) => AGE_BANDS.find((a) => a.id === id)?.label ?? "";
const genderLabel = (id) => GENDERS.find((g) => g.id === id)?.label ?? "";

export function toCSV(plays) {
  const head = ["id", "player", "name", "email", "age_band", "gender", "group", "status", "started_at", "completed_at", "device", "challenge", "force", "value", "method", "place", "swaps", "draws", "total_seconds", "challenge_seconds", "blanks_seconds", "questions_seconds", "questions_answered", "prompt", ...Array.from({ length: 5 }, (_, i) => `question_${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `answer_${i + 1}`)];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const sec = (ms) => (ms ? Math.round(ms / 100) / 10 : "");
  const rows = plays.map((p) => [
    p.id, p.pid, p.player?.name, p.player?.email, ageLabel(p.player?.age), genderLabel(p.player?.gender), p.group, p.status, p.startedAt, p.completedAt, p.device, p.challenge, p.picks?.forces, p.picks?.value, p.picks?.methods, p.picks?.places,
    p.swaps, p.draws, sec(p.durations?.total), sec(p.durations?.challenge), sec(p.durations?.blanks), sec(p.durations?.questions),
    (p.questions || []).filter((x) => (x.answer || "").trim()).length, p.prompt,
    ...Array.from({ length: 5 }, (_, i) => p.questions?.[i]?.text ?? ""), ...Array.from({ length: 5 }, (_, i) => p.questions?.[i]?.answer ?? ""),
  ].map(q).join(","));
  return [head.join(","), ...rows].join("\n");
}

// ---- sample data (clearly labelled in the UI; never mixed with real plays)
export function samplePlays(n = 180) {
  let s = 20260301;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (deck, weights) => {
    const cards = baseCards(deck);
    const w = weights || cards.map((_, i) => 1 + ((i * 7) % 3) * 0.6);
    let r = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cards.length; i++) { r -= w[i]; if (r <= 0) return cards[i].id; }
    return cards[cards.length - 1].id;
  };
  const day = 864e5, now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const started = new Date(now - rnd() * 21 * day);
    const completed = rnd() < 0.68;
    const reached = completed || rnd() < 0.7;
    const challenge = rnd() < 0.9 ? pick("issue", [4, 3, 2]) : null;
    const picks = {};
    if (challenge) for (const sl of SLOTS) if (completed || rnd() < 0.6) picks[sl.key] = pick(sl.deck);
    const full = challenge && SLOTS.every((sl) => picks[sl.key]);
    const total = Math.round((60 + rnd() * 420 + (completed ? 0 : 0)) * 1000);
    return {
      v: 1, id: `p_sample${i}`, pid: `u_sample${Math.floor(rnd() * 90)}`, group: rnd() < 0.35 ? ["delhi-a", "delhi-b", "course-1"][Math.floor(rnd() * 3)] : "",
      player: { name: "", age: AGE_BANDS[Math.floor(rnd() * (AGE_BANDS.length - 1))].id, gender: rnd() < 0.08 ? "na" : GENDERS[Math.floor(rnd() * 3)].id },
      status: completed ? "completed" : full ? "questions" : challenge ? "blanks" : "started",
      startedAt: started.toISOString(), completedAt: completed ? new Date(started.getTime() + total).toISOString() : null,
      challenge, picks, swaps: Math.floor(rnd() * 4), draws: Math.floor(rnd() * 3), pickLog: [],
      questions: reached && full ? Array.from({ length: 5 }, (_, k) => ({ id: `q${k}`, angle: "Sample", text: "Sample question", answer: completed && rnd() < 0.55 ? "Sample answer text for the preview." : "" })) : [],
      prompt: completed && rnd() < 0.6 ? "A sample prompt describing a future learning environment." : "",
      durations: completed ? { challenge: 3000 + rnd() * 9000, blanks: total * 0.45, questions: total * 0.5, total } : {},
      device: ["phone", "phone", "desktop", "tablet"][Math.floor(rnd() * 4)],
    };
  });
}
