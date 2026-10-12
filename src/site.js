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

// ---- cards made by visitors persist in this browser ----
const STORE = "pp.cards";
const mine = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } })();
const saveMine = () => { try { localStorage.setItem(STORE, JSON.stringify(mine)); } catch { /* storage blocked: cards last for this visit only */ } };

function phraseFor(deck, title) {
  const t = title.trim().toLowerCase();
  if (deck === "mode" || deck === "place") return /^(a|an|the)\s/.test(t) ? t : `the ${t}`;
  return t;
}
function addToDeck(deck, title, desc) {
  const cards = DECKS[deck].cards;
  const found = cards.findIndex((c) => c.t.toLowerCase() === title.trim().toLowerCase());
  if (found >= 0) { cards[found].d = deck === "action" ? undefined : desc; return found; }
  cards.push({ t: title.trim(), say: phraseFor(deck, title), d: deck === "action" ? undefined : desc, mine: true });
  return cards.length - 1;
}
mine.forEach((m) => addToDeck(m.deck, m.t, m.d));

function cardInner(deck, card) {
  const d = DECKS[deck];
  const glyph = d.glyph ? `<svg class="g" aria-hidden="true"><use href="#${d.glyph}"/></svg>` : "";
  const desc = card.d ? `<p class="d">${esc(card.d)}</p>` : "";
  return `<div class="in"><span class="k">${d.label}</span><div class="mid">${glyph}<span class="t">${esc(card.t)}</span>${desc}</div><span class="c">${d.code}</span></div>`;
}
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

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
function flip(deck, delay = 0, forceIndex) {
  if (busy.has(deck)) return;
  const slot = slotOf(deck);
  const flipper = $(".flipper", slot);
  const front = $(".front", slot);
  if (forceIndex === undefined) pick(deck); else state[deck] = forceIndex;
  const swap = () => {
    const card = DECKS[deck].cards[state[deck]];
    front.innerHTML = cardInner(deck, card);
    front.classList.toggle("mine", !!card.mine);
    syncDeck(deck);
  };
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
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8);
  }, delay);
}

function toast(msg) {
  const t = $(".toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove("show"), 2000);
}

function dealAll() {
  const free = ORDER.filter((d) => !held.has(d));
  if (!free.length) return toast("Every card is pinned. Unpin one to deal.");
  free.forEach((deck, i) => flip(deck, i * 140));
  hand += 1;
  $$("[data-hand]").forEach((el) => (el.textContent = `· hand ${hand}`));
}

// Pointer tilt + glare for a host element; vars are written on `target`, glare position on `host`.
function tiltable(host, target) {
  host.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || reduceMotion) return;
    const r = host.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    target.style.setProperty("--ry", `${(px - 0.5) * 24}deg`);
    target.style.setProperty("--rx", `${(0.5 - py) * 24}deg`);
    host.style.setProperty("--gx", `${px * 100}%`);
    host.style.setProperty("--gy", `${py * 100}%`);
    host.classList.add("live");
  });
  host.addEventListener("pointerleave", () => {
    target.style.removeProperty("--rx");
    target.style.removeProperty("--ry");
    host.classList.remove("live");
  });
}

// ---- hero wiring ----
$$(".slot").forEach((slot) => {
  const deck = slot.dataset.slot;
  $(".hit", slot).addEventListener("click", () => flip(deck));
  const lock = $(".lock", slot);
  lock.addEventListener("click", () => {
    const on = !held.has(deck);
    on ? held.add(deck) : held.delete(deck);
    lock.setAttribute("aria-pressed", String(on));
    lock.setAttribute("aria-label", `${on ? "Release" : "Hold"} this ${deck} card`);
    slot.classList.toggle("held", on);
  });
  tiltable(slot, $(".tilt", slot));
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
  if (/^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable) return;
  dealAll();
});

// ---- save as image / share ----
async function deliver(blob, name, shareTitle) {
  const file = new File([blob], name, { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: shareTitle }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Image saved");
}

$("[data-save]")?.addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const parts = [...$(".draft .scenario").childNodes].map((n) => ({ t: n.textContent, deck: n.dataset?.say }));
    const picks = Object.fromEntries(ORDER.map((d) => [d, DECKS[d].cards[state[d]]]));
    const { makePoster } = await import("./share.js");
    const blob = await makePoster(parts, picks, hand);
    await deliver(blob, `pedagogy-playcards-hand-${hand}.png`, "My draft scenario");
  } catch { toast("Couldn’t build the image"); }
  btn.disabled = false;
});

// ---- make a card ----
const form = $("#maker");
if (form) {
  const preview = $("#preview");
  const wrap = $(".make-card");
  const titleEl = form.elements.title;
  const descEl = form.elements.desc;
  const descField = $("[data-desc]", form);
  const count = $("[data-count]", form);
  const deckVal = () => form.elements.deck.value;
  const current = () => ({ t: titleEl.value.trim() || "Your card", d: deckVal() === "action" ? undefined : descEl.value.trim() });

  const render = () => {
    const deck = deckVal();
    descField.hidden = deck === "action";
    count.textContent = descEl.value.length;
    wrap.dataset.deck = deck;
    preview.dataset.deck = deck;
    preview.innerHTML = cardInner(deck, current());
    const ok = titleEl.value.trim().length > 0;
    $$("button[type=submit], [data-download-card]", form).forEach((b) => (b.disabled = !ok));
  };
  form.addEventListener("input", render);
  tiltable(wrap, preview);
  render();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const deck = deckVal();
    const { t, d } = current();
    const idx = addToDeck(deck, t, d);
    if (!mine.some((m) => m.deck === deck && m.t.toLowerCase() === t.toLowerCase())) mine.push({ deck, t, d });
    else mine.find((m) => m.deck === deck && m.t.toLowerCase() === t.toLowerCase()).d = d;
    saveMine();
    held.delete(deck);
    const slot = slotOf(deck);
    slot.classList.remove("held");
    $(".lock", slot).setAttribute("aria-pressed", "false");
    preview.classList.remove("bump"); void preview.offsetWidth; preview.classList.add("bump");
    $("#draw").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setTimeout(() => flip(deck, 0, idx), reduceMotion ? 0 : 700);
    toast(`“${t}” is in your hand`);
  });

  $("[data-download-card]", form).addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const { t, d } = current();
      const { makeCardPng } = await import("./share.js");
      const blob = await makeCardPng(deckVal(), { t, d });
      await deliver(blob, `playcard-${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, t);
    } catch { toast("Couldn’t build the image"); }
    btn.disabled = false;
  });
}


// ---- phone menu: full-screen sheet ----
const bar = $(".bar");
const menuBtn = $(".menu");
if (bar && menuBtn) {
  const setMenu = (open) => {
    bar.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    $("[data-menu-label]").textContent = open ? "Close" : "Menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
  };
  menuBtn.addEventListener("click", () => setMenu(!bar.classList.contains("open")));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  matchMedia("(min-width: 62rem)").addEventListener("change", (e) => e.matches && setMenu(false));
}

// ---- floating deal button: visible while the hero is on screen and its own button is not ----
const dock = $(".dock");
if (dock && "IntersectionObserver" in window) {
  let heroIn = true, rowIn = true;
  const sync = () => dock.classList.toggle("show", heroIn && !rowIn);
  new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; sync(); }).observe($(".hero"));
  new IntersectionObserver(([e]) => { rowIn = e.isIntersecting; sync(); }, { rootMargin: "0px 0px -10% 0px" }).observe($(".draft-row"));
}

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
