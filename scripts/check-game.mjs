// Sanity checks for the game logic. Run: node scripts/check-game.mjs
import { DECKS } from "../src/cards-data.js";
import { generateQuestions } from "../src/game/questions.js";
import { SAY } from "../src/game/config.js";

const ids = (k) => DECKS[k].cards.map((c) => c.id);
let combos = 0, bad = [];
for (const challenge of ids("issue")) for (const forces of ids("forces")) for (const value of ids("value"))
  for (const methods of ids("methods")) for (const places of ids("places")) {
    combos++;
    const qs = generateQuestions({ challenge, forces, value, methods, places });
    if (qs.length !== 5) bad.push([challenge, forces, value, methods, places, "count"]);
    for (const q of qs) if (/undefined|null|\[object/.test(q.text) || q.text.length < 40) bad.push([q.id, q.text]);
  }
const missing = Object.keys(DECKS).flatMap((k) => DECKS[k].cards.filter((c) => !SAY[c.id] && k !== "issue" || (k === "issue" && !SAY[c.id])).map((c) => c.id));
console.log(`combinations: ${combos} (expected 432)`);
console.log(`bad questions: ${bad.length}`, bad.slice(0, 3));
console.log("cards without a SAY phrase:", missing);
const sample = generateQuestions({ challenge: "skills-mismatch", forces: "flowing", value: "diversity", methods: "experiential-learning", places: "museum-gallery" });
sample.forEach((q) => console.log(`\n[${q.angle}]\n${q.text}`));
const s2 = generateQuestions({ challenge: "rising-educational-costs", forces: "becoming", value: "lifelong-learning", methods: "simulation-based-learning", places: "top-of-the-tree" });
console.log("\n--- second hand ---"); s2.forEach((q) => console.log(`[${q.angle}] ${q.text}`));
process.exit(bad.length ? 1 : 0);
