// Turns a finished hand into reflection questions. Rule-based and deterministic: the same hand always gets the same
// questions, but different hands read differently. Every question names the cards the player actually chose.

import { DECKS, titleOf } from "../cards-data.js";
import { SAY } from "./config.js";

const find = (deck, id) => DECKS[deck].cards.find((c) => c.id === id);
const firstSentence = (s) => (s || "").split(/(?<=[.!?])\s/)[0];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// sel: { challenge, forces, value, methods, places } (card ids)
export function generateQuestions(sel) {
  const issue = find("issue", sel.challenge);
  const force = find("forces", sel.forces);
  const value = find("value", sel.value);
  const method = find("methods", sel.methods);
  const place = find("places", sel.places);

  const I = SAY[issue.id] ?? titleOf(issue).toLowerCase();
  const V = SAY[value.id] ?? titleOf(value).toLowerCase();
  const M = SAY[method.id] ?? titleOf(method).toLowerCase().replace(/ \(method\)$/, "");
  const P = SAY[place.id] ?? `in ${titleOf(place)}`;
  const F = titleOf(force);
  const fs = firstSentence(force.desc);
  const seed = hash([sel.challenge, sel.forces, sel.value, sel.methods, sel.places].join("|"));
  const pick = (opts, n) => opts[(seed >>> n) % opts.length];

  return [
    {
      id: "issue-force",
      angle: "Challenge and force",
      text: pick([
        `The “${F}” card says: “${fs}” How does ${I} change in that world, and who feels it first?`,
        `Look at ${I} through “${F}”: “${fs}” Who is affected first, and who is left out?`,
      ], 1),
    },
    {
      id: "value",
      angle: "Value",
      text: pick([
        `What would it mean to start from ${V} when you tackle ${I}? Who decides what ${V} looks like here?`,
        `If ${V} came first, what would you stop doing about ${I}, and what would you start?`,
      ], 3),
    },
    {
      id: "method-place",
      angle: "Method and place",
      text: pick([
        `Picture ${M} happening ${P}. What do learners do there that they could not do in an ordinary classroom?`,
        `Who is part of it when ${M} takes place ${P}, and what are they each doing?`,
      ], 5),
    },
    {
      id: "tension",
      angle: "Tension",
      text: pick([
        `Where might ${M} work against ${V}? What would you change to keep both?`,
        `Can ${M} really deliver ${V}? What would have to be true for it to work?`,
      ], 7),
    },
    {
      id: "so-what",
      angle: "So what?",
      text: `So what? Imagine this becomes how education actually works. What is different about ${I} in five years, and what would you lose?`,
    },
  ];
}

// All the card ids a hand is made of, as one stable key for counting combinations.
export const comboKey = (p) => [p.challenge, p.picks?.forces, p.picks?.value, p.picks?.methods, p.picks?.places].join("|");
