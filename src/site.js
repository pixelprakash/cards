// Pedagogy Playcards: deal a hand, mirror it on the drafting template, reveal the quote on scroll.
// Only the four cards printed on the box are real; the rest are illustrative examples.

const DECKS = {
  action: {
    label: "Action Word", code: "A",
    cards: [
      { t: "Apply", say: "apply" },
      { t: "Remix", say: "remix" },
      { t: "Unlearn", say: "unlearn" },
      { t: "Gather", say: "gather around" },
      { t: "Trade", say: "trade" },
      { t: "Mend", say: "mend" },
      { t: "Perform", say: "perform" },
      { t: "Translate", say: "translate" },
      { t: "Forget", say: "forget" },
    ],
  },
  value: {
    label: "Value Card", code: "V", glyph: "g-v",
    cards: [
      { t: "Lifelong Learning", say: "lifelong learning", d: "Continuous search of knowledge and personal development beyond formal education. A commitment to ongoing learning." },
      { t: "Care", say: "care", d: "Attention to the wellbeing of others as the basis for how learning is organised." },
      { t: "Curiosity", say: "curiosity", d: "Following questions for their own sake, before anyone asks for an answer." },
      { t: "Equity", say: "fairness", d: "Access to learning that does not depend on where, or to whom, you were born." },
      { t: "Autonomy", say: "autonomy", d: "Learners setting their own direction, pace and measures of progress." },
      { t: "Solidarity", say: "solidarity", d: "Knowing and growing together, with shared credit and shared risk." },
      { t: "Playfulness", say: "playfulness", d: "Serious work done with lightness, where trying things out is allowed." },
    ],
  },
  mode: {
    label: "Mode & Methods Card", code: "M", glyph: "g-m",
    cards: [
      { t: "Flipped Classroom", say: "a flipped classroom", d: "Reverses the traditional teaching model: students meet the material beforehand and use class time for discussion and problem-solving." },
      { t: "Peer Circle", say: "peer circles", d: "Learners teach and question one another with no lecturer at the centre." },
      { t: "Apprenticeship", say: "apprenticeship", d: "Learning a practice by working beside someone who already does it." },
      { t: "Field Expedition", say: "field expeditions", d: "Leaving the classroom to study a place or problem where it actually lives." },
      { t: "Role‑play", say: "role-play", d: "Stepping into another position to understand how a situation looks from there." },
      { t: "Studio Critique", say: "studio critique", d: "Work shown unfinished and shaped by open, specific feedback." },
    ],
  },
  place: {
    label: "Places & Spaces Card", code: "P&S", glyph: "g-p",
    cards: [
      { t: "Artisanal Marketplace", say: "an artisanal marketplace", d: "Where locally crafted products are sold, often by independent artisans or small businesses." },
      { t: "Public Library", say: "a public library", d: "A shared civic space for borrowing knowledge, open to anyone who walks in." },
      { t: "Railway Platform", say: "a railway platform", d: "A place of waiting, crossing and chance meetings between strangers." },
      { t: "Community Kitchen", say: "a community kitchen", d: "A space where food is made for many hands and many mouths." },
      { t: "Rooftop Garden", say: "a rooftop garden", d: "Growing things in the air above the city, tended by whoever is around." },
      { t: "Riverbank", say: "a riverbank", d: "An open edge between land and water where activity follows the season." },
    ],
  },
};

const ORDER = ["action", "value", "mode", "place"];
const state = { action: 0, value: 0, mode: 0, place: 0 };
const held = new Set();
const busy = new Set();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let hand = 1;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const slotOf = (deck) => $(`.slot[data-slot="${deck}"]`);

function cardInner(deck, card) {
  const d = DECKS[deck];
  const glyph = d.glyph ? `<svg class="g" aria-hidden="true"><use href="#${d.glyph}"/></svg>` : "";
  const desc = card.d ? `<p class="d">${card.d}</p>` : "";
  return `<div class="in"><span class="k">${d.label}</span><div class="mid">${glyph}<span class="t">${card.t}</span>${desc}</div><span class="c">${d.code}</span></div>`;
}

// Write the chosen card into the sentence, the template and the slot's label, then sweep the highlight.
function syncDeck(deck) {
  const card = DECKS[deck].cards[state[deck]];
  $$(`[data-say="${deck}"]`).forEach((el) => {
    el.textContent = card.say;
    if (!reduceMotion) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  });
  $$(`[data-name="${deck}"]`).forEach((el) => (el.textContent = card.t));
  $(".hit", slotOf(deck))?.setAttribute("aria-label", `${DECKS[deck].label}: ${card.t}. Flip for a new one.`);
}

function pick(deck) {
  const n = DECKS[deck].cards.length;
  let next = state[deck];
  while (next === state[deck]) next = Math.floor(Math.random() * n);
  state[deck] = next;
}

// A full 360° spin that lifts toward the viewer; the new face is swapped in while the back is showing.
function flip(deck, delay = 0) {
  if (busy.has(deck)) return;
  const slot = slotOf(deck);
  const flipper = $(".flipper", slot);
  const front = $(".front", slot);
  pick(deck);
  const swap = () => { front.innerHTML = cardInner(deck, DECKS[deck].cards[state[deck]]); syncDeck(deck); };
  if (reduceMotion) return swap();

  busy.add(deck);
  const dur = 950;
  setTimeout(() => {
    const spin = flipper.animate(
      [
        { transform: "translateZ(0) rotateY(0deg) scale(1)" },
        { transform: "translateZ(90px) rotateY(180deg) scale(1.07)", offset: 0.5 },
        { transform: "translateZ(0) rotateY(360deg) scale(1)" },
      ],
      { duration: dur, easing: "cubic-bezier(.5,0,.2,1)" }
    );
    setTimeout(swap, dur * 0.5);
    spin.onfinish = spin.oncancel = () => busy.delete(deck);
    navigator.vibrate?.(8);
  }, delay);
}

function toast(msg) {
  const t = $(".toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("show"), 1800);
}

function dealAll() {
  const free = ORDER.filter((d) => !held.has(d));
  if (!free.length) return toast("Every card is pinned. Unpin one to deal.");
  free.forEach((deck, i) => flip(deck, i * 140));
  hand += 1;
  $$("[data-hand]").forEach((el) => (el.textContent = `· hand ${hand}`));
}

// ---- wiring ----
$$(".slot").forEach((slot) => {
  const deck = slot.dataset.slot;
  const tilt = $(".tilt", slot);
  $(".hit", slot).addEventListener("click", () => flip(deck));

  const lock = $(".lock", slot);
  lock.addEventListener("click", () => {
    const on = !held.has(deck);
    on ? held.add(deck) : held.delete(deck);
    lock.setAttribute("aria-pressed", String(on));
    lock.setAttribute("aria-label", `${on ? "Release" : "Hold"} this ${deck} card`);
    slot.classList.toggle("held", on);
  });

  // pointer tilt + glare (mouse and pen only)
  slot.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || reduceMotion) return;
    const r = slot.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tilt.style.setProperty("--ry", `${(px - 0.5) * 24}deg`);
    tilt.style.setProperty("--rx", `${(0.5 - py) * 24}deg`);
    slot.style.setProperty("--gx", `${px * 100}%`);
    slot.style.setProperty("--gy", `${py * 100}%`);
    slot.classList.add("live");
  });
  slot.addEventListener("pointerleave", () => {
    tilt.style.removeProperty("--rx");
    tilt.style.removeProperty("--ry");
    slot.classList.remove("live");
  });
});

$$("[data-deal]").forEach((btn) => btn.addEventListener("click", dealAll));
$("[data-deal-top]")?.addEventListener("click", () => setTimeout(dealAll, 650));
$("[data-copy]")?.addEventListener("click", async () => {
  const text = $(".draft .scenario").textContent.trim();
  try { await navigator.clipboard.writeText(text); toast("Scenario copied"); }
  catch { toast("Copy isn’t available here"); }
});
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "d" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
  dealAll();
});

// ---- opening: a face-down pile fans out to the table and turns over, card by card ----
function intro() {
  const root = document.documentElement;
  const slots = $$(".slot");
  if (reduceMotion || scrollY > 300) return root.classList.add("ready");
  const table = $(".table").getBoundingClientRect();
  const cx = table.left + table.width / 2;
  const cy = table.top + table.height / 2;
  slots.forEach((slot, i) => {
    const r = slot.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2) + (i - 1.5) * 4;
    const dy = cy - (r.top + r.height / 2) - i * 3;
    slot.style.zIndex = String(10 - i);
    const fly = slot.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${(i - 1.5) * 5}deg) scale(0.9)` },
        { transform: "none" },
      ],
      { duration: 900, delay: 250 + i * 120, easing: "cubic-bezier(.2,.85,.2,1)", fill: "backwards" }
    );
    fly.onfinish = () => (slot.style.zIndex = "");
    $(".flipper", slot).animate(
      [
        { transform: "translateZ(0) rotateY(180deg)" },
        { transform: "translateZ(70px) rotateY(270deg) scale(1.05)", offset: 0.55 },
        { transform: "translateZ(0) rotateY(360deg)" },
      ],
      { duration: 800, delay: 900 + i * 150, easing: "cubic-bezier(.4,0,.2,1)", fill: "backwards" }
    );
  });
  root.classList.add("ready");
}
intro();

// Quote: words light up as it scrolls through the viewport.
const quote = $("[data-reveal] p");
if (quote && !reduceMotion) {
  const words = quote.textContent.trim().split(/\s+/);
  quote.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  const spans = $$(".w", quote);
  let ticking = false;
  const update = () => {
    const r = quote.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
    const on = Math.round(p * spans.length);
    spans.forEach((s, i) => s.classList.toggle("on", i < on));
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}
