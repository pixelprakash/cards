// Everything that turns cards and answers into words, without AI: the sentence, clearer rewrites of it, and the three
// parts of the scenario. Pure functions, so they are easy to test (scripts/check-game.mjs).
// A selection looks like { issue: [id], forces: [id], value: [id, id], methods: [id], places: [id, id, id] }.

import { cardOf, cardsOf } from "./cards.js";
import { SLOTS, GROUPS } from "./config.js";

export const emptySelection = () => Object.fromEntries(SLOTS.map((s) => [s.key, []]));
export const hasMandatory = (sel) => SLOTS.every((s) => sel[s.key].length >= s.min);
export const countCards = (sel) => SLOTS.reduce((n, s) => n + sel[s.key].length, 0);
export const copySel = (sel) => Object.fromEntries(Object.entries(sel).map(([k, v]) => [k, [...v]]));

const say = (deck, id) => cardOf(deck, id)?.say ?? "";
const nm = (deck, id) => cardOf(deck, id)?.name ?? "";
const sayAll = (sel, slot) => sel[slot.key].map((id) => say(slot.deck, id)).filter(Boolean);
const nmAll = (sel, slot) => sel[slot.key].map((id) => nm(slot.deck, id)).filter(Boolean);
const slotOf = (key) => SLOTS.find((s) => s.key === key);

export function list(items) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
const clip = (s, n) => { const t = s.trim().replace(/\s+/g, " "); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };

// The sentence as the brief writes it, split into parts so the canvas can show the card slots in place.
export function sentenceParts() {
  const parts = [];
  for (const slot of SLOTS) {
    if (slot.key === "issue") { parts.push({ text: `${slot.lead} ` }, { slot: slot.key }, { text: ", a future" }); continue; }
    parts.push({ text: ` ${slot.lead} ` }, { slot: slot.key });   // every gap stays visible so any card can be added
  }
  parts.push({ text: "." });
  return parts;
}

// Variant 0 is the literal sentence; 1 and 2 are the "Make clearer" rewrites. Same ideas, smoother grammar.
export function sentenceText(sel, variant = 0) {
  const issue = sayAll(sel, slotOf("issue"))[0];
  const force = sayAll(sel, slotOf("forces"))[0];
  const values = list(sayAll(sel, slotOf("value")));
  const method = sayAll(sel, slotOf("methods"))[0];
  const places = list(sayAll(sel, slotOf("places")));
  const blank = "…";
  const I = issue ?? blank, M = method ?? blank;

  if (variant === 1) {
    const bits = [`Imagine a future${force ? ` shaped by ${force},` : ""} where learning happens through ${M}${places ? ` in ${places}` : ""}`];
    return `${bits[0]}, in response to ${I}${values ? ` and prioritising ${values}` : ""}.`;
  }
  if (variant === 2) {
    const first = `This future responds to ${I}.`;
    const second = `${force ? `Shaped by ${force}, it` : "It"}${values ? ` prioritises ${values} and` : ""} learns through ${M}${places ? ` in ${places}` : ""}.`;
    return `${first} ${second}`;
  }
  return `In response to ${I}, a future${force ? ` shaped by ${force}` : ""}${values ? ` that prioritises ${values}` : ""}${force || values ? "" : " that works"} through learning by ${M}${places ? ` in ${places}` : ""}.`;
}
export const CLEAR_VARIANTS = 2;

// ---- the scenario (Step 4): three short parts, built only from the cards and the player's own words
const answer = (answers, id) => (answers?.[id] ?? "").trim();
const FIELDS = ["title", "idea", "difference"];
export { FIELDS };

function titleOptions(sel) {
  const issue = nmAll(sel, slotOf("issue"))[0], force = nmAll(sel, slotOf("forces"))[0], method = nmAll(sel, slotOf("methods"))[0];
  const values = nmAll(sel, slotOf("value")), places = nmAll(sel, slotOf("places"));
  const out = [];
  if (places[0] && force) out.push(`${places[0]} of ${force}`);
  if (values[0]) out.push(`${values.join(" and ")} first`);
  if (issue) out.push(`After ${issue}`);
  if (method && places[0]) out.push(`${method.replace(/ \(method\)$/i, "")} at the ${places[0]}`);
  if (force && values[0]) out.push(`${force}, with ${values[0].toLowerCase()}`);
  return out.length ? out : [method ?? "A future for learning"];
}

function ideaOptions(sel, answers) {
  const issue = sayAll(sel, slotOf("issue"))[0], force = sayAll(sel, slotOf("forces"))[0];
  const values = list(sayAll(sel, slotOf("value"))), method = sayAll(sel, slotOf("methods"))[0], places = list(sayAll(sel, slotOf("places")));
  const out = [];
  out.push(`A future where learning happens through ${method}${places ? ` in ${places}` : ""}, in response to ${issue}${values ? `, prioritising ${values}` : ""}.`);
  out.push(`People learn through ${method}${places ? ` in ${places}` : ""}${force ? `, in a world shaped by ${force}` : ""}${values ? `, guided by ${values}` : ""}.`);
  const own = answer(answers, "experience-1");
  if (own) out.push(`In this future, ${clip(own, 220).replace(/^[A-Z]/, (c) => c.toLowerCase())}${/[.!?…]$/.test(own.trim()) ? "" : "."}`);
  return out;
}

function differenceOptions(sel, answers) {
  const issue = sayAll(sel, slotOf("issue"))[0];
  const values = list(sayAll(sel, slotOf("value"))), method = sayAll(sel, slotOf("methods"))[0], places = list(sayAll(sel, slotOf("places")));
  const out = [];
  const diff = answer(answers, "experience-2");
  if (diff) out.push(clip(diff, 260));
  out.push(`Rather than living with ${issue}, this future starts from ${values || "what its learners need"} and learns through ${method}${places ? ` in ${places}` : ""}.`);
  const hard = answer(answers, "tensions-3");
  if (hard) out.push(`What would be hardest to change: ${clip(hard, 220)}`);
  return out;
}

const OPTIONS = { title: titleOptions, idea: ideaOptions, difference: differenceOptions };

// The n-th draft of a field (cycles through the options that the cards and answers allow).
export function draftField(field, sel, answers, n = 0) {
  const opts = OPTIONS[field](sel, answers);
  return opts[((n % opts.length) + opts.length) % opts.length];
}

export function draftAll(sel, answers, counts = {}) {
  return Object.fromEntries(FIELDS.map((f) => [f, draftField(f, sel, answers, counts[f] ?? 0)]));
}

export const answeredCount = (answers) => Object.values(answers ?? {}).filter((v) => (v ?? "").trim()).length;
export const questionText = (id) => {
  const [g, n] = id.split("-");
  return GROUPS.find((x) => x.key === g)?.qs[Number(n) - 1] ?? "";
};

// ---- random hands
// rnd() returns a number in [0, 1). Locked cards stay; empty slots are filled; with fresh = true every unlocked slot is redrawn.
export function randomHand(sel, locked, rnd = Math.random, { fresh = false } = {}) {
  const next = copySel(sel);
  const pickN = (deck, n, keep) => {
    const pool = deck.filter((id) => !keep.includes(id));
    const out = [...keep];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return out;
  };
  for (const slot of SLOTS) {
    if (!fresh && next[slot.key].length) continue;   // filling gaps: leave filled slots alone
    const ids = Object.keys(locked).filter((k) => k.startsWith(`${slot.deck}:`)).map((k) => k.slice(slot.deck.length + 1)).filter((id) => next[slot.key].includes(id));
    const keep = fresh ? ids : next[slot.key];
    const deck = cardsOf(slot.deck).map((c) => c.id);
    // how many: mandatory slots always, optional ones usually; value 1 to 2, places 1 to 3
    const want = slot.min ? slot.max : Math.max(keep.length, 1 + Math.floor(rnd() * slot.max));
    next[slot.key] = pickN(deck, Math.max(want, keep.length), keep).slice(0, slot.max);
  }
  return next;
}
