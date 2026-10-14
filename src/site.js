// Pedagogy Playcards: deal a hand from the five real decks, write a prompt, browse every card.
// The cards come from ./cards-data.js (transcribed from photographs of the printed decks).

import { DECKS, DECK_ORDER, INITIAL_HAND, cardFace, faceInner, titleOf, wrapTitle } from "./cards-data.js";

const state = { ...INITIAL_HAND };
const held = new Set();
const busy = new Set();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let hand = 1;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const slotOf = (deck) => $(`.slot[data-slot="${deck}"]`);
const cardOf = (deck) => DECKS[deck].cards[state[deck]];

// ---- cards made by visitors persist in this browser ----
const STORE = "pp.cards.v2";
const mine = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; } })();
const saveMine = () => { try { localStorage.setItem(STORE, JSON.stringify(mine)); } catch { /* storage blocked: cards last for this visit */ } };

function addCustom(deck, title, desc) {
  const cards = DECKS[deck].cards;
  const card = {
    id: `mine-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    mine: true,
    lines: wrapTitle(title),
    desc: desc || undefined,
    art: { type: deck === "value" ? "star" : "pin" },
  };
  const at = cards.findIndex((c) => c.mine && c.id === card.id);
  if (at >= 0) { cards[at] = card; return at; }
  cards.push(card);
  return cards.length - 1;
}
mine.filter((m) => DECKS[m.deck]).forEach((m) => addCustom(m.deck, m.title, m.desc));

// ---- keeping the page in step with the hand ----
const handText = () => DECK_ORDER.map((d) => `${DECKS[d].name}: ${titleOf(cardOf(d))}`);

const announce = () => {
  clearTimeout(announce.id);
  announce.id = setTimeout(() => {
    const sr = $("#sr");
    if (sr) sr.textContent = `New hand: ${handText().join("; ")}.`;
  }, 700);
};

function syncDeck(deck) {
  const card = cardOf(deck);
  $$(`[data-name="${deck}"]`).forEach((el) => (el.textContent = titleOf(card)));
  $(".hit", slotOf(deck))?.setAttribute("aria-label", `${DECKS[deck].noun}: ${titleOf(card)}. Flip for a new one.`);
  announce();
}

function pick(deck) {
  const n = DECKS[deck].cards.length;
  let next = state[deck];
  while (next === state[deck] && n > 1) next = Math.floor(Math.random() * n);
  state[deck] = next;
}

// A full 360° spin that lifts toward the viewer; the new face is swapped in while the deck's back is showing.
function flip(deck, delay = 0, forceIndex) {
  if (busy.has(deck)) return;
  const slot = slotOf(deck);
  const flipper = $(".flipper", slot);
  const front = $(".front", slot);
  if (forceIndex === undefined) pick(deck); else state[deck] = forceIndex;
  const swap = () => {
    const card = cardOf(deck);
    front.innerHTML = faceInner(deck, card, { eager: true, sizes: "125px" });
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
  toast.id = setTimeout(() => t.classList.remove("show"), 4500);
}

function dealAll() {
  const free = DECK_ORDER.filter((d) => !held.has(d));
  if (!free.length) return toast("Every card is pinned. Unpin one to deal.");
  free.forEach((deck, i) => flip(deck, i * 130));
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
    if (on) held.add(deck);
    else held.delete(deck);
    lock.setAttribute("aria-pressed", String(on));
    lock.setAttribute("aria-label", `${on ? "Release" : "Hold"} this ${DECKS[deck].name} card`);
    slot.classList.toggle("held", on);
  });
  tiltable(slot, $(".tilt", slot));
});

$$("[data-deal]").forEach((btn) => btn.addEventListener("click", dealAll));
$("[data-deal-top]")?.addEventListener("click", () => setTimeout(dealAll, 650));
addEventListener("keydown", (e) => {
  if (!e.shiftKey || e.key.toLowerCase() !== "d" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable) return;
  dealAll();
});

// The prompt is written once and mirrored on the drafting template.
const promptEl = $("#prompt");
const tplPrompt = $("[data-prompt]");
const EMPTY_PROMPT = tplPrompt?.textContent ?? "";
promptEl?.addEventListener("input", () => {
  const v = promptEl.value.trim();
  tplPrompt.textContent = v || EMPTY_PROMPT;
  tplPrompt.classList.toggle("empty", !v);
});

$("[data-copy]")?.addEventListener("click", async () => {
  const text = [`Hand ${hand}`, ...handText(), promptEl.value.trim() && `Prompt: ${promptEl.value.trim()}`].filter(Boolean).join("\n");
  try { await navigator.clipboard.writeText(text); toast("Hand and prompt copied"); }
  catch { toast("Copy isn’t available here"); }
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
  if (btn.getAttribute("aria-busy")) return;
  btn.setAttribute("aria-busy", "true");
  try {
    const cards = DECK_ORDER.map((deck) => ({ deck, card: cardOf(deck) }));
    const { makePoster } = await import("./share.js");
    const blob = await makePoster(cards, promptEl.value.trim(), hand);
    await deliver(blob, `pedagogy-playcards-hand-${hand}.png`, "My hand and prompt");
  } catch { toast("Couldn’t build the image"); }
  btn.removeAttribute("aria-busy");
});

// ---- make a card (Value cards and new Places, the two the PDF says visitors can add) ----
const form = $("#maker");
if (form) {
  const preview = $("#preview");
  const wrap = $(".make-card");
  const titleEl = form.elements.title;
  const descEl = form.elements.desc;
  const descField = $("[data-desc]", form);
  const count = $("[data-count]", form);
  const err = $("#title-error");
  const deckVal = () => form.elements.deck.value;
  const current = () => {
    const deck = deckVal();
    const title = titleEl.value.trim() || "Your card";
    return { deck, title, desc: deck === "value" ? descEl.value.trim() : "" };
  };
  const draftCard = () => {
    const { deck, title, desc } = current();
    return { mine: true, lines: wrapTitle(title), desc: desc || undefined, art: { type: deck === "value" ? "star" : "pin" } };
  };
  const clearError = () => { err.hidden = true; titleEl.removeAttribute("aria-invalid"); };
  const needTitle = () => {
    if (titleEl.value.trim()) return false;
    err.hidden = false;
    titleEl.setAttribute("aria-invalid", "true");
    titleEl.focus();
    return true;
  };

  const render = () => {
    const { deck } = current();
    descField.hidden = deck !== "value";
    count.textContent = descEl.value.length;
    wrap.dataset.deck = deck;
    preview.className = `card preview c-${deck} mine`;
    preview.dataset.deck = deck;
    preview.innerHTML = faceInner(deck, draftCard(), { eager: true, sizes: "200px" });
    if (titleEl.value.trim()) clearError();
  };
  form.addEventListener("input", render);
  tiltable(wrap, preview);
  render();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (needTitle()) return;
    const { deck, title, desc } = current();
    const idx = addCustom(deck, title, desc);
    const known = mine.find((m) => m.deck === deck && m.title.toLowerCase() === title.toLowerCase());
    if (known) known.desc = desc; else mine.push({ deck, title, desc });
    saveMine();
    held.delete(deck);
    const slot = slotOf(deck);
    slot.classList.remove("held");
    $(".lock", slot).setAttribute("aria-pressed", "false");
    preview.classList.remove("bump"); void preview.offsetWidth; preview.classList.add("bump");
    $("#draw").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    setTimeout(() => flip(deck, 0, idx), reduceMotion ? 0 : 700);
    toast(`“${title}” is in your hand`);
  });

  $("[data-download-card]", form).addEventListener("click", async (e) => {
    if (needTitle()) return;
    const btn = e.currentTarget;
    if (btn.getAttribute("aria-busy")) return;
    btn.setAttribute("aria-busy", "true");
    try {
      const { deck, title } = current();
      const { makeCardPng } = await import("./share.js");
      const blob = await makeCardPng(deck, draftCard());
      await deliver(blob, `playcard-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, title);
    } catch { toast("Couldn’t build the image"); }
    btn.removeAttribute("aria-busy");
  });
}

// ---- the gallery: filter by deck, open a card larger ----
const filters = $$("[data-filter]");
filters.forEach((btn) =>
  btn.addEventListener("click", () => {
    const which = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    $$(".browse .item").forEach((li) => (li.hidden = which !== "all" && li.dataset.deck !== which));
  })
);

const dlg = $("#zoom");
if (dlg) {
  const slot = $("#zoom-card");
  const cap = $("#zoom-cap");
  let opener = null;
  $$("[data-zoom]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [deck, id] = btn.dataset.zoom.split(":");
      const card = DECKS[deck].cards.find((c) => c.id === id);
      if (!card) return;
      opener = btn;
      slot.innerHTML = cardFace(deck, card, { eager: true, sizes: "340px" });
      cap.textContent = `${DECKS[deck].noun}: ${titleOf(card)}`;
      dlg.setAttribute("aria-label", cap.textContent);
      dlg.showModal();
    })
  );
  const close = () => dlg.close();
  $("[data-zoom-close]", dlg).addEventListener("click", close);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener("close", () => opener?.focus());
}

// ---- phone menu: full-screen sheet; the page behind is inert while it is open ----
const bar = $(".bar");
const menuBtn = $(".menu");
if (bar && menuBtn) {
  const behind = [$("#main"), $(".dock"), $(".site-foot")].filter(Boolean);
  const setMenu = (open, returnFocus = true) => {
    bar.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    $("[data-menu-label]").textContent = open ? "Close" : "Menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
    behind.forEach((el) => (el.inert = open));
    if (open) $("#nav a")?.focus();
    else if (returnFocus) menuBtn.focus();
  };
  menuBtn.addEventListener("click", () => setMenu(!bar.classList.contains("open")));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => setMenu(false, false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && bar.classList.contains("open")) setMenu(false); });
  matchMedia("(min-width: 62rem)").addEventListener("change", (e) => e.matches && setMenu(false, false));
}

// ---- deck stack: only stack while every sheet's content fits; otherwise let the sheets flow ----
const decksEl = $(".decks");
if (decksEl) {
  const sheets = $$(".sheet", decksEl);
  const stackable = matchMedia("(min-width: 62rem) and (min-height: 46rem)");
  const fit = () => {
    if (!stackable.matches) return;
    decksEl.classList.remove("flow");
    // measure the real content, not the oversized decorative glyph that overflows on purpose
    const clipped = sheets.some((s) => {
      const bottom = s.getBoundingClientRect().bottom;
      return [$(".copy", s), $(".fan", s)].some((el) => el && el.getBoundingClientRect().bottom > bottom - 4);
    });
    if (clipped) decksEl.classList.add("flow");
  };
  // Content growth (text-spacing overrides, font swap) re-checks until it has flipped to flow; a resize starts over.
  const ro = new ResizeObserver(() => { if (!decksEl.classList.contains("flow")) fit(); });
  sheets.forEach((s) => ro.observe($(".copy", s)));
  addEventListener("resize", fit);
  document.fonts?.ready.then(fit);
  fit();
}

// ---- floating deal button: visible while the hero is on screen and its own button is not ----
const dock = $(".dock");
if (dock && "IntersectionObserver" in window) {
  let heroIn = true, rowIn = true;
  const sync = () => dock.classList.toggle("show", heroIn && !rowIn);
  new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; sync(); }).observe($(".hero"));
  new IntersectionObserver(([e]) => { rowIn = e.isIntersecting; sync(); }, { rootMargin: "0px 0px -10% 0px" }).observe($(".draft-row"));
}

// ---- opening: each deck's own back arrives in a pile, fans out to the table and turns over, card by card ----
function intro() {
  const root = document.documentElement;
  const slots = $$(".slot");
  // On a slow connection the page was already revealed by the head script: skip the opening rather than replay it.
  if (reduceMotion || scrollY > 300 || root.classList.contains("ready")) return root.classList.add("ready");
  const table = $(".table").getBoundingClientRect();
  const cx = table.left + table.width / 2;
  const cy = table.top + table.height / 2;
  const mid = (slots.length - 1) / 2;
  slots.forEach((slot, i) => {
    const r = slot.getBoundingClientRect();
    const dx = cx - (r.left + r.width / 2) + (i - mid) * 4;
    const dy = cy - (r.top + r.height / 2) - i * 3;
    slot.style.zIndex = String(10 - i);
    const fly = slot.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${(i - mid) * 5}deg) scale(0.9)` },
        { transform: "none" },
      ],
      { duration: 600, delay: 80 + i * 60, easing: "cubic-bezier(.2,.85,.2,1)", fill: "backwards" }
    );
    fly.onfinish = () => (slot.style.zIndex = "");
    $(".flipper", slot).animate(
      [
        { transform: "translateZ(0) rotateY(180deg)" },
        { transform: "translateZ(70px) rotateY(270deg) scale(1.05)", offset: 0.55 },
        { transform: "translateZ(0) rotateY(360deg)" },
      ],
      { duration: 600, delay: 320 + i * 80, easing: "cubic-bezier(.4,0,.2,1)", fill: "backwards" }
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
