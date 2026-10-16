// Static markup for the Research Background page, built from the game's final card data (src/cards/data.js).
// Used by vite.config.js at build time (and dev), so every card name is in the crawlable HTML.

import { DECKS, DECK_KEYS, cardOf } from "./game/cards.js";
import { sentenceText } from "./game/sentence.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const DECK_ORDER = ["value", "places", "forces", "methods", "issue"];
const CODE = { value: "V", places: "P&S", forces: "12", methods: "M", issue: "I" };
const img = (src, extra = "") => `<img src="${src}" alt="" width="300" height="525" decoding="async"${extra}>`;

// the example hand from the October brief, by card id
export const EXAMPLE = {
  issue: ["rising-educational-costs"], forces: ["sharing"], value: ["lifelong-learning", "resilience"],
  methods: ["problem-based-learning"], places: ["outdoor-spaces", "forests-farmlands", "makerspace"],
};
const exampleCards = () => Object.entries(EXAMPLE).flatMap(([k, ids]) => ids.map((id) => ({ deck: k, card: cardOf(k, id) })));

export function heroHTML() {
  return DECK_KEYS.map((k, i) => `<span style="--i:${i}">${img(DECKS[k].coverSm, ' fetchpriority="high"')}</span>`).join("");
}

export function exampleHTML() {
  const cards = exampleCards().map(({ card }, i) => `<li style="--i:${i}">${img(card.sm, ' loading="lazy"')}</li>`).join("");
  return `<ul class="ex-cards" aria-hidden="true">${cards}</ul><p class="ex-text">${esc(sentenceText(EXAMPLE, 0))}</p>`;
}

export function sheetsHTML() {
  return DECK_ORDER.map((k, n) => {
    const d = DECKS[k];
    const code = CODE[k];
    const faces = [d.cards[0], d.cards[Math.floor(d.cards.length / 2)]];
    const im = (src, srcset) => `<img src="${src}"${srcset ? ` srcset="${srcset}" sizes="14rem"` : ""} alt="" width="300" height="525" loading="lazy" decoding="async">`;
    const art = `<div class="deck-art" aria-hidden="true"><span class="da da-l">${im(faces[0].sm, `${faces[0].sm} 300w, ${faces[0].img} 600w`)}</span><span class="da da-r">${im(faces[1].sm, `${faces[1].sm} 300w, ${faces[1].img} 600w`)}</span><span class="da da-f">${im(d.coverSm, `${d.coverSm} 300w, ${d.cover} 600w`)}</span></div>`;
    return `<article class="sheet" data-deck="${k}" style="--n:${n}"><div class="tab"><span class="tab-code">${esc(code)}</span>${esc(d.name)}</div><div class="sheet-body"><div class="copy"><h2>${esc(d.name)}</h2><p>${esc(d.blurb)}</p><p class="count"><b>${d.cards.length}</b> cards</p><a class="sheet-link" href="#cards-all" data-browse="${k}">Browse the ${d.cards.length} cards <span aria-hidden="true">&rarr;</span><span class="vh"> of ${esc(d.name)}</span></a></div>${art}</div></article>`;
  }).join("");
}

export function galleryHTML() {
  const items = DECK_ORDER.flatMap((k) => DECKS[k].cards.map((c) => `<li class="item" data-deck="${k}"><button class="zoom" type="button" data-img="${c.img}" data-name="${esc(c.name)}" data-noun="${esc(DECKS[k].noun)}" data-desc="${esc(c.desc)}">${img(c.sm, ' loading="lazy"')}<span class="vh">${esc(c.name)}, ${esc(DECKS[k].noun)}, open larger</span></button></li>`)).join("");
  const backs = DECK_ORDER.map((k) => `<li class="item" data-deck="${k}">${img(DECKS[k].coverSm, ' loading="lazy"')}<span class="vh">Back of the ${esc(DECKS[k].name)} deck</span></li>`).join("");
  const chips = [["all", "All decks"], ...DECK_ORDER.map((k) => [k, DECKS[k].name])].map(([k, n], i) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${i === 0}"${k !== "all" ? ` data-deck="${k}"` : ""}>${esc(n)}</button>`).join("");
  return { chips, items, backs };
}
