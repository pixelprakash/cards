// The real printed cards, transcribed from photographs of the physical decks.
// Only cards whose full face was visible are included. Wording is exact; line breaks in `lines` follow the print.
// This module is shared by the build (static HTML for every card) and the browser (hero hand, maker, image export).

const ART_DIVERSITY = {"src": "/cards/art/diversity.webp", "w": 375, "h": 342, "sm": {"src": "/cards/art/diversity-sm.webp", "w": 300, "h": 274}};
const ART_LIFELONG = {"src": "/cards/art/lifelong-learning.webp", "w": 292, "h": 307, "sm": {"src": "/cards/art/lifelong-learning-sm.webp", "w": 285, "h": 300}};
const ART_SUSTAINABILITY = {"src": "/cards/art/sustainability.webp", "w": 382, "h": 405, "sm": {"src": "/cards/art/sustainability-sm.webp", "w": 283, "h": 300}};
const ART_COLLABORATION = {"src": "/cards/art/collaboration.webp", "w": 255, "h": 247, "sm": {"src": "/cards/art/collaboration-sm.webp", "w": 300, "h": 291}};
const ART_SIMCENTER = {"src": "/cards/art/simulation-center.webp", "w": 556, "h": 789, "sm": {"src": "/cards/art/simulation-center-sm.webp", "w": 211, "h": 300}};
const ART_MUSEUM = {"src": "/cards/art/museum-gallery.webp", "w": 535, "h": 741, "sm": {"src": "/cards/art/museum-gallery-sm.webp", "w": 217, "h": 300}};
const ART_TREE = {"src": "/cards/art/top-of-the-tree.webp", "w": 523, "h": 801, "sm": {"src": "/cards/art/top-of-the-tree-sm.webp", "w": 196, "h": 300}};
const ART_BIODOME = {"src": "/cards/art/bio-dome.webp", "w": 450, "h": 585, "sm": {"src": "/cards/art/bio-dome-sm.webp", "w": 231, "h": 300}};
const ART_FLOWING = {"src": "/cards/art/flowing.webp", "w": 390, "h": 390, "sm": {"src": "/cards/art/flowing-sm.webp", "w": 300, "h": 300}};
const ART_DISCUSSION = {"src": "/cards/art/discussion-based-learning.webp", "w": 457, "h": 457, "sm": {"src": "/cards/art/discussion-based-learning-sm.webp", "w": 300, "h": 300}};
const ART_EXPERIENTIAL = {"src": "/cards/art/experiential-learning.webp", "w": 352, "h": 345, "sm": {"src": "/cards/art/experiential-learning-sm.webp", "w": 300, "h": 294}};
const ART_SIMULATION = {"src": "/cards/art/simulation-based-learning.webp", "w": 480, "h": 375, "sm": {"src": "/cards/art/simulation-based-learning-sm.webp", "w": 300, "h": 234}};
const ART_SKILLS = {"src": "/cards/art/skills-mismatch.webp", "w": 472, "h": 360, "sm": {"src": "/cards/art/skills-mismatch-sm.webp", "w": 300, "h": 229}};
const ART_CURRICULAR = {"src": "/cards/art/curricular-problems.webp", "w": 382, "h": 360, "sm": {"src": "/cards/art/curricular-problems-sm.webp", "w": 300, "h": 283}};
const ART_COSTS = {"src": "/cards/art/rising-educational-costs.webp", "w": 382, "h": 337, "sm": {"src": "/cards/art/rising-educational-costs-sm.webp", "w": 300, "h": 265}};

export const DECK_ORDER = ["value", "places", "forces", "methods", "issue"];

export const DECKS = {
  value: {
    key: "value", name: "Value Cards", noun: "Value card", logo: "Value Cards",
    border: "#f4dd6b", panel: "#fbfcff", titleColor: "#d2323f", descColor: "#34343a",
    sheet: "#f4dd6b", sheetInk: "#16130a", sheetHead: "#16130a",
    blurb: "Each card names a value and defines it in a line or two.",
    custom: true, titleMax: 12.4, descSize: 5.6,
    cards: [
      { id: "diversity", lines: ["Diversity"], desc: "The presence of people with different backgrounds, ideas, view points and ways of life in the same place.", art: ART_DIVERSITY },
      { id: "lifelong-learning", lines: ["Lifelong", "Learning"], desc: "The habit of gaining new knowledge and skills throughout your life. A steady effort to update your knowledge as the world and technology change.", art: ART_LIFELONG },
      { id: "sustainability", lines: ["Sustainability"], desc: "Using resources wisely to meet today\u2019s needs while safeguarding them for future generations.", art: ART_SUSTAINABILITY },
      { id: "collaboration", lines: ["Collaboration"], desc: "People working together toward a shared goal by using each person\u2019s strengths, where people share ideas to solve problems as one team.", art: ART_COLLABORATION },
    ],
  },
  places: {
    key: "places", name: "Places and Spaces", noun: "Places and Spaces card", logo: "Places & Spaces",
    border: "#eb9a4f", panel: "#fbfcff", titleColor: "#4a1a2a", descColor: "#34343a",
    sheet: "#eb9a4f", sheetInk: "#2a0f19", sheetHead: "#2a0f19",
    blurb: "The physical and imagined spaces where learning might occur, including public venues and speculative environments. Users can extend the list by inventing new, context-specific spaces.",
    custom: true, titleMax: 12.4, mixed: true,
    cards: [
      { id: "simulation-center", lines: ["Simulation", "Center"], art: ART_SIMCENTER },
      { id: "museum-gallery", lines: ["Museum /", "Gallery"], art: ART_MUSEUM },
      { id: "top-of-the-tree", lines: ["Top of the", "Tree"], art: ART_TREE },
      { id: "bio-dome", lines: ["Bio-Dome"], art: ART_BIODOME },
    ],
  },
  forces: {
    key: "forces", name: "12 Forces of Change", noun: "Forces of Change card", logo: "12 Forces of Change",
    border: "#3f5ca6", panel: "#fbfcff", titleColor: "#2d4796", descColor: "#4a4a52",
    sheet: "#3f5ca6", sheetInk: "#f2f5ff", sheetHead: "#ffffff",
    blurb: "Each card names a force, describes it, and ends with a \u201cSo what?\u201d prompt.",
    titleMax: 13.4, descSize: 4.1,
    cards: [
      { id: "beginning", lines: ["Beginning"], desc: "Global connectivity and a planetary internet herald a new era of systemic birth and coordination. A universal digital consciousness is emerging.", art: { type: "sun" } },
      { id: "flowing", lines: ["Flowing"], desc: "Information no longer exists as static units but flows continuously through networks. The internet acts as a superorganism with real-time interconnectivity as its lifeblood. Services and processes that facilitate constant flow are favored over static products.", art: ART_FLOWING },
      { id: "becoming", lines: ["Becoming"], desc: "Technology is in a constant state of evolution and upgrade, never static but always in beta. Our tools, identities, and knowledge are continuously edited and improved. Mastery is temporary, and lifelong learning is essential.", art: { type: "spinner" } },
    ],
  },
  methods: {
    key: "methods", name: "Methods of Learning", noun: "Methods of Learning card", logo: "Methods of Learning",
    border: "#e0806b", panel: "#fbfcff", titleColor: "#3a231f", descColor: "#34343a",
    sheet: "#e0806b", sheetInk: "#2b1613", sheetHead: "#2b1613",
    blurb: "Each card names a method of learning and says in one line how students learn through it.",
    titleMax: 10.8, descSize: 5.6,
    cards: [
      { id: "discussion-based-learning", lines: ["Discussion-", "Based", "Learning"], desc: "Students build ideas through dialogues, debates, and guided conversation.", art: ART_DISCUSSION },
      { id: "experiential-learning", lines: ["Experiential", "Learning"], desc: "Students learn through action, observation, and reflection.", art: ART_EXPERIENTIAL },
      { id: "simulation-based-learning", lines: ["Simulation-Based", "Learning (Method)"], desc: "Students use controlled scenarios or digital simulations to practice skills.", art: ART_SIMULATION },
    ],
  },
  issue: {
    key: "issue", name: "Issue Cards", noun: "Issue card", logo: "Issue card",
    border: "#eaa850", panel: "#fbfcff", titleColor: "#2f3a8c", descColor: "#383d93",
    sheet: "#eaa850", sheetInk: "#2a1d06", sheetHead: "#2a1d06",
    blurb: "Each card names an issue facing education and describes it in a line.",
    titleMax: 9.6, descSize: 4.7,
    cards: [
      { id: "skills-mismatch", lines: ["Skills", "Mismatch"], desc: "A gap between what graduates can do and what employers or communities actually need.", art: ART_SKILLS },
      { id: "curricular-problems", lines: ["Curricular", "Problems"], desc: "Course content that is outdated, misaligned with learner needs, or poorly structured for real-world use.", art: ART_CURRICULAR },
      { id: "rising-educational-costs", lines: ["Rising", "Educational", "Costs"], desc: "Steady growth in tuition, fees, and related expenses that makes higher education harder to afford.", art: ART_COSTS },
    ],
  },
};

export const TAGLINE = ["Play cards to explore", "the future of pedagogy and learning"];

// ---------------------------------------------------------------- rendering

// The hand dealt when the page opens (an index into each deck).
export const INITIAL_HAND = { value: 1, places: 1, forces: 1, methods: 1, issue: 1 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const titleOf = (card) => card.lines.join(" ").replace("- ", "-");

// Break a typed title into short lines, the way the printed titles are set.
export function wrapTitle(title) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 13) lines[lines.length - 1] = last + " " + w;
    else lines.push(w);
  }
  return lines.length ? lines : ["Your card"];
}

// Font size (in cqw) that fits the longest line, the way the print scales each title.
export function titleSize(deck, lines) {
  const d = DECKS[deck];
  const longest = Math.max(...lines.map((l) => l.length));
  const factor = d.mixed ? 0.55 : 0.64;
  const target = d.mixed ? 72 : deck === "issue" ? 70 : 74;
  return Math.min(d.titleMax, +(target / (longest * factor)).toFixed(1));
}

const SPINNER = (() => {
  let bars = "";
  for (let p = 0; p < 12; p++) {
    const a = 0.12 + (0.88 * ((p + 11) % 12)) / 11;
    bars += `<rect x="46" y="4" width="8" height="24" rx="4" fill="#2f2d33" fill-opacity="${a.toFixed(2)}" transform="rotate(${p * 30} 50 50)"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${bars}</svg>`;
})();
const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c.8 5.6 4.4 9.2 10 10-5.6.8-9.2 4.4-10 10-.8-5.6-4.4-9.2-10-10 5.6-.8 9.2-4.4 10-10z"/></svg>`;
const PIN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

function artHTML(card, o) {
  const a = card.art;
  if (a.type === "spinner") return `<div class="art art-spin">${SPINNER}</div>`;
  if (a.type === "sun") return `<div class="art art-sun"><span></span></div>`;
  if (a.type === "star") return `<div class="art art-icon">${STAR}</div>`;
  if (a.type === "pin") return `<div class="art art-icon">${PIN}</div>`;
  const srcset = a.sm ? ` srcset="${a.sm.src} ${a.sm.w}w, ${a.src} ${a.w}w" sizes="${o.sizes || "200px"}"` : "";
  return `<div class="art"><img src="${a.src}"${srcset} width="${a.w}" height="${a.h}" alt="" decoding="async"${o.eager ? "" : ' loading="lazy"'}${o.priority ? ' fetchpriority="high"' : ""}></div>`;
}

// Everything inside a card face (used on its own when a card is swapped in place).
export function faceInner(deckKey, card, opts = {}) {
  const d = DECKS[deckKey];
  const ts = titleSize(deckKey, card.lines);
  const title = card.lines.map(esc).join("<br>");
  const desc = card.desc ? `<p class="cd">${esc(card.desc)}</p>` : "";
  const extra =
    deckKey === "forces" ? `<span class="sw">So what?</span><span class="lg">${esc(d.logo)}</span>` :
    deckKey === "places" ? "" :
    `<span class="lg">${esc(d.logo)}</span>`;
  const strip = deckKey === "places" ? `<i class="strip" aria-hidden="true"><b></b><b></b></i>` : "";
  const mine = card.mine ? `<i class="mt">Your card</i>` : "";
  return `${strip}<div class="pn"><span class="ct" style="--ts:${ts}">${title}</span>${artHTML(card, opts)}${desc}${extra}${mine}</div>`;
}

// One card face.
export function cardFace(deckKey, card, { tag = "div", cls = "", attrs = "", ...opts } = {}) {
  return `<${tag} class="card c-${deckKey} ${cls}${card.mine ? " mine" : ""}" data-deck="${deckKey}"${attrs}>${faceInner(deckKey, card, opts)}</${tag}>`;
}

const PUZZLE = `<svg class="pz" viewBox="0 0 63 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="63" height="110" fill="#e89a47"/><path d="M0 5h27v44H0z" fill="#2f84e0"/><circle cx="30" cy="36" r="8.5" fill="#2f84e0"/><path d="M42 0h21v26H42z" fill="#c9444c"/><path d="M0 58h26v40H0z" fill="#52b3b8"/><circle cx="24" cy="54" r="8" fill="#52b3b8"/><path d="M28 58h35v36H28z" fill="#efe05a"/><circle cx="46" cy="52" r="9" fill="#efe05a"/><path d="M0 96h20v14H0z" fill="#c9444c"/></svg>`;

// The back of a deck.
export function cardBack(deckKey, { cls = "" } = {}) {
  const tag = `<p class="bt">${TAGLINE.map((l) => esc(l)).join("<br>")}</p>`;
  const logos = {
    value: `<span class="bl"><b>Value</b><b>Cards</b></span>`,
    methods: `<span class="bl"><b>Methods</b><b>Of</b><b>Learning</b></span>`,
    places: `<span class="bl"><b>Places</b><b>and</b><b>Spaces</b></span>`,
    forces: `<span class="bl"><b>12</b><b>Forces of</b><b>Change</b></span>`,
    issue: `<span class="bl"><b>Issue card</b></span>`,
  };
  return `<div class="card back c-${deckKey} ${cls}" data-deck="${deckKey}" aria-hidden="true">${deckKey === "places" ? PUZZLE : ""}${logos[deckKey]}${tag}</div>`;
}

export const allCards = () => DECK_ORDER.flatMap((k) => DECKS[k].cards.map((c) => ({ deck: k, card: c })));
export const DECK_CODE = { value: "V", places: "P&S", forces: "12", methods: "M", issue: "I" };

// ---- static markup for the build: hero hand, deck sheets, card gallery ----

export function heroSlotsHTML() {
  return DECK_ORDER.map((k, i) => {
    const d = DECKS[k];
    const card = d.cards[INITIAL_HAND[k]];
    return `<div class="slot" data-slot="${k}" style="--i:${i}"><div class="tilt"><div class="flipper">${cardFace(k, card, { cls: "front", eager: true, priority: true, sizes: "125px" })}${cardBack(k)}</div></div><button class="hit" type="button" aria-label="${d.noun}: ${esc(titleOf(card))}. Flip for a new one."></button><button class="lock" type="button" aria-pressed="false" aria-label="Hold this ${esc(d.name)} card"><svg aria-hidden="true"><use href="#lock"/></svg></button></div>`;
  }).join("");
}

export function sheetsHTML() {
  return DECK_ORDER.map((k, n) => {
    const d = DECKS[k];
    const fan = d.cards.map((c, i) => cardFace(k, c, { attrs: ` style="--i:${i}" aria-hidden="true"` })).join("");
    const titles = d.cards.map((c) => `<li>${esc(titleOf(c))}</li>`).join("");
    const pill = d.custom ? `<span class="pill">${k === "value" ? "Make your own cards" : "Invent new places"}</span>` : "";
    const code = DECK_CODE[k];
    return `<article class="sheet" data-deck="${k}" style="--n:${n}"><div class="tab"><span class="tab-code">${esc(code)}</span>${esc(d.name)}</div><div class="sheet-body"><span class="glyph${code.length > 1 ? " glyph-wide" : ""}" aria-hidden="true">${esc(code)}</span><div class="copy"><h2>${esc(d.name)}</h2><p>${esc(d.blurb)}</p><ul class="titles" aria-label="Cards shown">${titles}</ul>${pill}</div><div class="fan" style="--n:${d.cards.length}">${fan}</div></div></article>`;
  }).join("");
}

export function browseHTML() {
  const items = allCards().map(({ deck, card }) => {
    return `<li class="item" data-deck="${deck}"><button class="zoom" type="button" data-zoom="${deck}:${card.id}">${cardFace(deck, card, { tag: "span", sizes: "200px" })}<span class="vh">, open larger</span></button></li>`;
  }).join("");
  const backs = DECK_ORDER.map((k) => `<li class="item" data-deck="${k}">${cardBack(k)}<span class="vh">Back of the ${esc(DECKS[k].name)} deck</span></li>`).join("");
  const chips = [["all", "All decks"], ...DECK_ORDER.map((k) => [k, DECKS[k].name])].map(([k, n], i) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${i === 0}"${k !== "all" ? ` data-deck="${k}"` : ""}>${esc(n)}</button>`).join("");
  return { chips, items, backs };
}
