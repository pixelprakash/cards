// Sanity checks for the game's wording. Run:  node scripts/check-game.mjs
// 1) every random hand reads as a full sentence in all three wordings, 2) the scenario drafts are never empty,
// 3) every card has a phrase and an image file, 4) the mandatory rules hold.
import { existsSync } from "node:fs";
import { DECKS, DECK_KEYS } from "../src/game/cards.js";
import { SLOTS } from "../src/game/config.js";
import { emptySelection, hasMandatory, randomHand, sentenceText, draftAll, FIELDS } from "../src/game/sentence.js";

let bad = 0;
const fail = (m) => { bad += 1; if (bad < 12) console.log("FAIL:", m); };

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const cards = DECK_KEYS.reduce((n, k) => n + DECKS[k].cards.length, 0);
for (const k of DECK_KEYS) for (const c of DECKS[k].cards) {
  if (!c.say) fail(`no phrase for ${k}/${c.id}`);
  for (const f of [c.img, c.sm]) if (!existsSync(`public${f}`)) fail(`missing file ${f}`);
}
for (const k of DECK_KEYS) for (const f of [DECKS[k].cover, DECKS[k].coverSm]) if (!existsSync(`public${f}`)) fail(`missing cover ${f}`);

const seen = new Set();
for (let i = 0; i < 5000; i++) {
  const sel = randomHand(emptySelection(), {}, rnd, { fresh: true });
  if (!hasMandatory(sel)) fail("random hand misses a mandatory card");
  for (const s of SLOTS) if (sel[s.key].length > s.max) fail(`too many ${s.key}`);
  for (const v of [0, 1, 2]) {
    const t = sentenceText(sel, v);
    if (/undefined|…|\bnull\b|  /.test(t)) fail(`odd sentence: ${t}`);
    if (!/[.]$/.test(t)) fail(`no full stop: ${t}`);
  }
  const d = draftAll(sel, {}, {});
  for (const f of FIELDS) if (!d[f]?.trim()) fail(`empty ${f}`);
  seen.add(JSON.stringify(sel));
}
// locks: a locked card survives a fresh draw
const base = randomHand(emptySelection(), {}, rnd, { fresh: true });
const lockKey = `places:${base.places[0]}`;
for (let i = 0; i < 200; i++) if (!randomHand(base, { [lockKey]: true }, rnd, { fresh: true }).places.includes(base.places[0])) fail("locked place lost");
// filling gaps leaves chosen cards alone
const part = { ...emptySelection(), issue: ["skills-mismatch"] };
if (randomHand(part, {}, rnd).issue[0] !== "skills-mismatch") fail("gap fill replaced a chosen card");

console.log(`cards: ${cards} across ${DECK_KEYS.length} decks`);
console.log(`distinct random hands in 5000 draws: ${seen.size}`);
console.log(`problems: ${bad}`);
console.log("sample:", sentenceText(randomHand(emptySelection(), {}, rnd, { fresh: true }), 0));
process.exit(bad ? 1 : 0);
