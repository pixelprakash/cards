// The game console (the /play page), built to the October brief.
// Flow: about you -> 1 Discover (draw / choose / explore) -> 2 Assemble (cards + sentence on one canvas)
//       -> 3 Imagine (optional questions) -> 4 Describe (title, idea, difference) -> Finish (save, email, feedback).
// Every play is recorded through ./store.js for the researcher view. No AI: all wording is rule-based (./sentence.js).

import { DECKS, DECK_KEYS, cardsOf, cardOf } from "./cards.js";
import { STEPS, SLOTS, SLOT_BY_DECK, GROUPS, NUDGES, AGE_BANDS, GENDERS, CONSENT, EMAIL_PURPOSE } from "./config.js";
import { emptySelection, copySel, hasMandatory, countCards, sentenceParts, sentenceText, CLEAR_VARIANTS, draftField, draftAll, FIELDS, randomHand } from "./sentence.js";
import { newPlay, save, cleanPlayer } from "./store.js";

const root = document.getElementById("console");
const screen = document.getElementById("screen");
const overlay = document.getElementById("overlay");
if (root && screen && overlay) init();

function init() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const sr = document.getElementById("sr");
  const announce = (msg) => { if (sr) { sr.textContent = ""; setTimeout(() => { sr.textContent = msg; }, 30); } };

  const ui = {
    step: "you", group: "", profile: null, pre: null,
    libDeck: "issue", libMode: "explore", choose: null, chooseOpener: "", choseNow: false,
    showDetails: false, moreTools: false, clarity: 0, groups: 1, nudges: {}, gen: { title: 0, idea: 0, difference: 0 }, draftKey: "",
    versions: [], vcur: 0, locked: {}, stepAt: Date.now(),
  };
  let play = null;
  let t0 = Date.now();

  const sel = () => play.picks;
  const key = (deck, id) => `${deck}:${id}`;

  // ------------------------------------------------------------------ helpers
  const hud = (step) => {
    const at = STEPS.findIndex((s) => s.key === step);
    return `<ol class="gc-hud" aria-label="Progress">${STEPS.map((s, i) => `<li class="${i < at ? "is-done" : ""}${i === at ? " is-on" : ""}"${i === at ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="l">${s.label}</span></li>`).join("")}</ol>`;
  };
  const persist = (opts) => { if (play) save(play, opts); };
  const sentence = () => sentenceText(sel(), ui.clarity);

  function leaveStep() {
    if (!play) return;
    const k = ui.step === "library" ? "discover" : ui.step;
    if (["discover", "assemble", "imagine", "describe"].includes(k)) play.durations[k] = (play.durations[k] || 0) + (Date.now() - ui.stepAt);
  }

  function go(step, { focus = true } = {}) {
    if (ui.choose) { ui.choose = null; overlay.hidden = true; overlay.innerHTML = ""; screen.inert = false; }
    leaveStep();
    ui.step = step;
    ui.stepAt = Date.now();
    root.dataset.step = step;
    if (play && !["you", "finish"].includes(step)) play.status = step === "library" ? "discover" : step;
    render();
    screen.scrollTop = 0;
    if (focus) screen.querySelector(".gc-title")?.focus({ preventScroll: true });
    if (!reduceMotion) { screen.classList.remove("swap"); void screen.offsetWidth; screen.classList.add("swap"); }
  }

  function commit() {   // keep the current version's snapshot in step with the cards on the table
    ui.versions[ui.vcur] = copySel(sel());
    play.stats.versions = ui.versions.length;
    play.sentence = sentence();
    play.challenge = sel().issue[0] ?? null;
    persist();
  }

  // ------------------------------------------------------------------ card building blocks
  // A card tile: the image (sharper on big screens) with the card's name written underneath, so it can always be read.
  const SIZES = "(min-width: 62rem) 11rem, (min-width: 40rem) 9rem, 30vw";
  const cardImg = (c) => `<img src="${c.sm}" srcset="${c.sm} 300w, ${c.img} 600w" sizes="${SIZES}" alt="" width="300" height="525" loading="lazy" decoding="async">`;
  const tile = (deck, c, extra = "") => {
    const inSel = sel()[SLOT_BY_DECK[deck].key].includes(c.id);
    return `<button type="button" class="gc-tile${inSel ? " is-in" : ""}" data-act="open-card" data-deck="${deck}" data-id="${c.id}" data-nav aria-label="${esc(c.name)}, ${esc(DECKS[deck].noun)}${inSel ? ", in your combination" : ""}"${extra}>${cardImg(c)}<span class="gc-cap" aria-hidden="true">${esc(c.name)}</span>${inSel ? '<span class="gc-tick" aria-hidden="true">&#10003;</span>' : ""}</button>`;
  };

  // What the sentence still needs, in reading order (Issue and Method of learning are required).
  const missing = () => SLOTS.filter((x) => sel()[x.key].length < x.min);
  const NEED = { issue: "an issue", forces: "a force of change", value: "a value", methods: "a method of learning", places: "a place" };
  const needText = () => { const m = missing().map((x) => NEED[x.key]); return m.length ? `Still needed: ${m.length > 1 ? `${m.slice(0, -1).join(", ")} and ${m.at(-1)}` : m[0]}.` : ""; };

  // A progress strip for the five decks: what is chosen, what is required. Tapping one goes to that deck.
  function trackerHTML(active) {
    const items = SLOTS.map((x) => {
      const names = sel()[x.key].map((id) => cardOf(x.deck, id)?.name).filter(Boolean);
      const done = names.length >= Math.max(1, x.min);
      const state = names.length ? names.join(" + ") : x.min ? "Required" : "Optional";
      return `<li><button type="button" class="gc-trk${done ? " is-done" : ""}${x.min && !names.length ? " is-req" : ""}" data-act="track" data-deck="${x.deck}" data-nav${active === x.deck ? ' aria-current="step"' : ""}><span class="gc-trk-mark" aria-hidden="true">${done ? "&#10003;" : ""}</span><span class="gc-trk-t"><b>${esc(x.label)}</b><i>${esc(state)}</i></span></button></li>`;
    }).join("");
    return `<ol class="gc-track" aria-label="Your combination">${items}</ol>`;
  }

  // Clicking Continue (or a tool) with a required card missing takes you to choosing it, instead of doing nothing.
  function guideToMissing() {
    const first = missing()[0];
    if (!first) return false;
    announce(`${needText()} Choose ${NEED[first.key]} to continue.`);
    openChooser(first.deck, 0, `[data-act="continue"], [data-act="to-assemble"]`);
    return true;
  }

  // ------------------------------------------------------------------ the card chooser
  // A full-height panel over the screen, like a deck picker: a plain list of names on one side, the card large with its
  // text in real type on the other, and one clear button to choose it. Used by Assemble and by the library.
  const chosenIn = (deck) => sel()[SLOT_BY_DECK[deck].key];
  function statusText() {
    const { deck } = ui.choose, slot = SLOT_BY_DECK[deck], chosen = chosenIn(deck);
    const names = chosen.map((id) => cardOf(deck, id)?.name).filter(Boolean);
    if (slot.max > 1) return `${chosen.length} of ${slot.max} chosen${names.length ? `: ${names.join(", ")}` : ""}`;
    return names.length ? `Chosen: ${names[0]}` : "Nothing chosen yet";
  }
  function detailHTML() {
    const { deck, idx } = ui.choose, slot = SLOT_BY_DECK[deck], cards = cardsOf(deck), c = cards[idx], chosen = chosenIn(deck);
    const on = chosen.includes(c.id), locked = !!ui.locked[key(deck, c.id)];
    const full = !on && slot.max > 1 && chosen.length >= slot.max;
    const swapLocked = !on && slot.max === 1 && chosen[0] && ui.locked[key(deck, chosen[0])];
    const note = swapLocked ? "The card in this gap is locked. Unlock it to choose another." : full ? `You already have ${slot.max}. Remove one to add this.` : on && locked ? "This card is locked. Unlock it to remove it." : "";
    const label = on ? "Remove this card" : slot.max === 1 && chosen.length ? "Use this card instead" : "Choose this card";
    return `<div class="gc-ch-card"><img src="${c.img}" alt="" width="600" height="1050" decoding="async"></div>
      <div class="gc-ch-text">
        <p class="gc-kicker">${esc(DECKS[deck].noun)} &middot; ${idx + 1} of ${cards.length}</p>
        <h3>${esc(c.name)}</h3>
        <p class="gc-ch-desc${c.desc ? "" : " gc-ch-none"}">${c.desc ? esc(c.desc) : "This card shows a place and has no printed description."}</p>
        ${note ? `<p class="gc-fine">${esc(note)}</p>` : ""}
        ${on ? `<button type="button" class="gc-keep" data-act="ch-keep" data-nav aria-pressed="${locked}">${locked ? "Kept when you shuffle" : "Keep this card when I shuffle"}</button>` : ""}
        <div class="gc-ch-nav">
          <button type="button" class="gc-ch-step" data-act="ch-prev" data-nav aria-label="Previous card">&larr;</button>
          <button type="button" class="gc-go gc-ch-choose" data-act="ch-choose" data-nav data-primary${swapLocked || full || (on && locked) ? " disabled" : ""}>${label}</button>
          <button type="button" class="gc-ch-step" data-act="ch-next" data-nav aria-label="Next card">&rarr;</button>
        </div>
      </div>`;
  }
  function chooserHTML() {
    const { deck, idx } = ui.choose, slot = SLOT_BY_DECK[deck], chosen = chosenIn(deck);
    const list = cardsOf(deck).map((x, i) => `<li><button type="button" class="gc-ch-item${chosen.includes(x.id) ? " is-on" : ""}" data-act="ch-go" data-idx="${i}" data-nav${i === idx ? ' aria-current="true"' : ""}><span class="gc-ch-name">${esc(x.name)}</span>${chosen.includes(x.id) ? '<span class="gc-ch-tick" aria-hidden="true">&#10003;</span><span class="vh"> (chosen)</span>' : ""}</button></li>`).join("");
    return `<div class="gc-ch" role="dialog" aria-modal="true" aria-labelledby="ch-h" data-deck="${deck}">
      <header class="gc-ch-top"><div><p class="gc-kicker">${esc(DECKS[deck].name)}</p><h2 id="ch-h" class="gc-ch-h" tabindex="-1">${esc(slot.ask)}</h2><p class="gc-ch-status" data-status>${esc(statusText())}</p></div><button type="button" class="gc-go gc-sm" data-act="ch-done" data-nav>Done</button></header>
      <div class="gc-ch-body"><ul class="gc-ch-list" aria-label="${esc(DECKS[deck].name)}">${list}</ul><div class="gc-ch-detail" data-detail>${detailHTML()}</div></div>
    </div>`;
  }
  const chList = () => overlay.querySelector(".gc-ch-list");
  function openChooser(deck, idx, opener) {
    ui.choose = { deck, idx: Math.max(0, idx) };
    ui.chooseOpener = opener;
    overlay.innerHTML = chooserHTML();
    overlay.hidden = false;
    screen.inert = true;
    const cur = overlay.querySelector('.gc-ch-item[aria-current="true"]');
    cur?.focus({ preventScroll: true });
    cur?.scrollIntoView({ block: "center", inline: "center" });
  }
  function closeChooser({ restore = true } = {}) {
    if (!ui.choose) return;
    const closedDeck = ui.choose.deck;
    ui.choose = null;
    overlay.hidden = true;
    overlay.innerHTML = "";
    screen.inert = false;
    if (ui.step === "library" && chosenIn(closedDeck).length && ui.choseNow) {
      const next = SLOTS.find((x) => x.deck !== closedDeck && SLOTS.indexOf(x) > SLOTS.findIndex((y) => y.deck === closedDeck) && !sel()[x.key].length) || missing()[0];
      if (next) { ui.libDeck = next.deck; announce(`Next: ${SLOT_BY_DECK[next.deck].ask.toLowerCase()}.`); }
    }
    ui.choseNow = false;
    render();
    if (restore && ui.chooseOpener) focusAfter(ui.chooseOpener);
  }
  // swap the card shown on the right without rebuilding the list (keeps scroll and focus)
  function paintDetail(idx) {
    ui.choose.idx = idx;
    overlay.querySelector("[data-detail]").innerHTML = detailHTML();
    overlay.querySelectorAll(".gc-ch-item").forEach((b, i) => (i === idx ? b.setAttribute("aria-current", "true") : b.removeAttribute("aria-current")));
  }
  // rebuild everything (after a card was chosen or removed), keeping the list where it was
  function repaintChooser(focusSel) {
    const l = chList(), top = l.scrollTop, left = l.scrollLeft;
    overlay.innerHTML = chooserHTML();
    const l2 = chList(); l2.scrollTop = top; l2.scrollLeft = left;
    if (focusSel) overlay.querySelector(focusSel)?.focus({ preventScroll: true });
  }
  function chooseCurrent() {
    const { deck, idx } = ui.choose, slot = SLOT_BY_DECK[deck], c = cardsOf(deck)[idx];
    const on = chosenIn(deck).includes(c.id);
    if (on) { removeCard(deck, c.id); announce(`${c.name} removed.`); repaintChooser('[data-act="ch-choose"]'); return; }
    if (slot.max === 1) {
      const old = chosenIn(deck)[0];
      if (old && ui.locked[key(deck, old)]) return;
      if (old) delete ui.locked[key(deck, old)];
    }
    if (!addCard(deck, c.id)) { announce(`You can have up to ${slot.max}. Remove one first.`); return; }
    announce(`${c.name} chosen.`);
    ui.choseNow = true;
    if (slot.max === 1) closeChooser(); else repaintChooser('[data-act="ch-choose"]');
  }

  // ------------------------------------------------------------------ screens
  const screens = {
    you() {
      const pr = ui.profile || {};
      const scale = (name, val, lo, hi) => `<fieldset class="gc-field gc-scale"><legend id="${name}-l">${name === "pre" ? "How easy or difficult is it for you to imagine alternative futures of education?" : ""} <i>(optional)</i></legend><div class="gc-scale-row" role="radiogroup" aria-labelledby="${name}-l">${[1, 2, 3, 4, 5].map((n) => `<label class="gc-radio gc-num"><input type="radio" name="${name}" value="${n}"${String(val) === String(n) ? " checked" : ""}><span>${n}</span></label>`).join("")}</div><div class="gc-scale-ends" aria-hidden="true"><span>1 = ${lo}</span><span>5 = ${hi}</span></div></fieldset>`;
      return `<form class="gc-scr gc-you" novalidate>
        <p class="gc-kicker">Before you start</p>
        <h2 class="gc-title" tabindex="-1">A little about you</h2>
        <p class="gc-sub">It helps the researchers see who is playing. It takes about a minute.</p>
        <div class="gc-fields">
          <label class="gc-field"><span>Your name <i>(optional)</i></span><input name="name" maxlength="40" autocomplete="name" value="${esc(pr.name)}"></label>
          <label class="gc-field"><span>Your age</span><select name="age" aria-describedby="you-err" required><option value="">Choose one</option>${AGE_BANDS.map((a) => `<option value="${a.id}"${pr.age === a.id ? " selected" : ""}>${a.label}</option>`).join("")}</select></label>
          <fieldset class="gc-field gc-radios"><legend>Your gender</legend>
            ${GENDERS.map((g) => `<label class="gc-radio"><input type="radio" name="gender" value="${g.id}"${pr.gender === g.id ? " checked" : ""}><span>${g.label}</span></label>`).join("")}
          </fieldset>
          ${scale("pre", ui.pre, "Very difficult", "Very easy")}
        </div>
        <details class="gc-fold"${ui.group ? " open" : ""}><summary>Part of a workshop? Add a group code</summary><label class="gc-field"><span>Group or workshop code</span><input name="group" maxlength="24" autocomplete="off" value="${esc(ui.group)}"></label></details>
        <p class="gc-err" id="you-err" role="alert"></p>
        <p class="gc-fine">${esc(CONSENT)}</p>
        <div class="gc-acts"><a class="gc-ghost" href="/" data-nav>Leave</a><button type="submit" class="gc-go" data-nav data-primary>Start playing</button></div>
      </form>`;
    },

    discover() {
      return `<div class="gc-scr">${hud("discover")}
        <h2 class="gc-title" tabindex="-1">How do you want to start?</h2>
        <div class="gc-disc"><div class="gc-opts" role="group" aria-label="Ways to start">
          <button type="button" class="gc-opt gc-opt-main" data-act="draw" data-nav data-primary><b>Draw cards randomly</b><span>A surprise hand, ready to use. The quickest way to begin.</span></button>
          <button type="button" class="gc-opt" data-act="choose" data-nav><b>Choose cards myself</b><span>Pick one deck at a time. We guide you through it.</span></button>
          <button type="button" class="gc-opt" data-act="explore" data-nav><b>Just explore the cards</b><span>Look at the cards first. Nothing is decided yet.</span></button>
        </div>
        <div class="gc-dk"><h3 class="gc-tiny">The five decks</h3>
          <ul class="gc-decklist">${DECK_KEYS.map((k) => `<li data-deck="${k}"><img src="${DECKS[k].coverSm}" alt="" width="300" height="525" loading="lazy"><span><b>${esc(DECKS[k].name)}</b><i>${esc(DECKS[k].blurb)}</i></span></li>`).join("")}</ul>
        </div></div>
      </div>`;
    },

    library() {
      const deck = ui.libDeck, choose = ui.libMode === "choose";
      const slot = SLOT_BY_DECK[deck];
      const hint = needText();
      return `<div class="gc-scr">${hud("discover")}
        <h2 class="gc-title" tabindex="-1">${choose ? "Choose your cards" : "Explore the cards"}</h2>
        <p class="gc-sub">${choose ? "One deck at a time: tap a card to read it, then choose it. You need an issue and a method of learning. The rest is optional." : "Tap any card to read it. Choose the ones you like. You can change everything later."}</p>
        ${trackerHTML(deck)}
        ${hint ? `<p class="gc-need-top">${esc(hint)}</p>` : ""}
        <div class="gc-deckrow"><p class="gc-deckhint">${esc(slot.ask)}${slot.min ? " (required)" : " (optional)"}</p>${slot.min ? "" : `<button type="button" class="gc-ghost gc-sm" data-act="skip" data-nav>Skip this deck &rarr;</button>`}</div>
        <ul class="gc-grid">${cardsOf(deck).map((c) => `<li>${tile(deck, c)}</li>`).join("")}</ul>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button>${hint ? `<span class="gc-need" id="lib-need">${esc(hint)}</span>` : ""}<button type="button" class="gc-go" data-act="to-assemble" data-nav data-primary${hint ? ' aria-describedby="lib-need"' : ""}>Continue to Assemble</button></div>
      </div>`;
    },

    assemble() {
      const s = sel();
      const parts = sentenceParts().map((p) => {
        if (p.text !== undefined) return `<span class="gc-w">${esc(p.text)}</span>`;
        const slot = SLOTS.find((x) => x.key === p.slot);
        const chips = s[slot.key].map((id) => {
          const c = cardOf(slot.deck, id), lk = !!ui.locked[key(slot.deck, id)];
          return `<span class="gc-chipwrap" data-deck="${slot.deck}"><button type="button" class="gc-chip" data-act="slot" data-slot="${slot.key}" data-nav aria-label="${esc(c.name)}${lk ? ", kept when shuffling" : ""}. Change this card.">${lk ? '<svg class="gc-kept" viewBox="0 0 24 24" aria-hidden="true"><use href="#lock"/></svg>' : ""}${esc(c.name)}</button></span>`;
        }).join("");
        const add = s[slot.key].length < slot.max ? `<button type="button" class="gc-chip gc-chip-add${s[slot.key].length ? " is-more" : ""}" data-deck="${slot.deck}" data-act="slot" data-slot="${slot.key}" data-nav aria-label="${esc(slot.ask)}">${s[slot.key].length ? "+ add" : esc(slot.ask)}</button>` : "";
        return `<span class="gc-slot">${chips}${add}</span>`;
      }).join("");

      const strip = SLOTS.flatMap((x) => s[x.key].map((id) => cardOf(x.deck, id))).map((c) => `<li><img src="${c.sm}" srcset="${c.sm} 300w, ${c.img} 600w" sizes="9rem" alt="" width="300" height="525"></li>`).join("");
      const vn = ui.versions.length;
      const moreOpen = ui.moreTools || ui.clarity || vn > 1 || ui.showDetails;
      const versions = vn > 1 ? `<div class="gc-versions" role="group" aria-label="Versions"><button type="button" class="gc-ghost gc-sm" data-act="ver-prev" data-nav${ui.vcur === 0 ? " disabled" : ""}>&larr; Previous version</button><span>Version ${ui.vcur + 1} of ${vn}</span><button type="button" class="gc-ghost gc-sm" data-act="ver-next" data-nav${ui.vcur === vn - 1 ? " disabled" : ""}>Next version &rarr;</button></div>` : "";
      const clear = ui.clarity ? `<div class="gc-clear"><p class="gc-tiny">Clearer wording (same cards)</p><p class="gc-clear-t">${esc(sentence())}</p></div>` : "";
      const ok = hasMandatory(s);
      return `<div class="gc-scr">${hud("assemble")}
        <h2 class="gc-title" tabindex="-1">Assemble your future</h2>
        <p class="gc-sub">Fill each gap with a card. Tap a gap to choose one.</p>
        ${ok ? "" : `<div class="gc-callout" role="status"><span>${esc(needText())}</span><button type="button" class="gc-go gc-sm" data-act="need" data-nav>Choose ${esc(NEED[missing()[0].key])}</button></div>`}
        <div class="gc-canvas" role="group" aria-label="Your future so far"><p class="gc-sentence">${parts}</p>${strip ? `<ul class="gc-strip" aria-hidden="true">${strip}</ul>` : ""}</div>
        ${clear}
        <div class="gc-tools" role="group" aria-label="Tools">
          <button type="button" class="gc-ghost gc-sm" data-act="random" data-nav>${SLOTS.some((x) => !s[x.key].length) ? "Fill the empty gaps" : "Shuffle my cards"}</button>
          <button type="button" class="gc-ghost gc-sm" data-act="more-tools" data-nav aria-expanded="${moreOpen}">${moreOpen ? "Fewer options" : "More options"}</button>
        </div>
        ${moreOpen ? `<ul class="gc-more">
          <li><button type="button" class="gc-ghost gc-sm" data-act="${ui.clarity ? "unclarify" : "clarify"}" data-nav>${ui.clarity ? "Use my original wording" : "Make clearer"}</button><span>${ui.clarity ? "Go back to the sentence as it was." : "Smooths the sentence. Your cards stay the same."}</span></li>
          <li><button type="button" class="gc-ghost gc-sm" data-act="version" data-nav>Explore a different version</button><span>Try another combination. Your current one is kept.</span></li>
          <li><button type="button" class="gc-ghost gc-sm" data-act="details" data-nav aria-expanded="${ui.showDetails}">Add more details</button><span>Write your own thoughts about it.</span></li>
        </ul>` : ""}
        ${versions}
        ${ui.showDetails ? `<label class="gc-field gc-wide"><span>Your own thoughts on this combination <i>(optional)</i></span><textarea data-details rows="3" maxlength="800" placeholder="Anything you want to add">${esc(play.details)}</textarea></label>` : ""}
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="button" class="gc-go" data-act="continue" data-nav data-primary>Continue</button></div>
      </div>`;
    },

    imagine() {
      const g = ui.groups;
      const shown = GROUPS.slice(0, g).map((grp) => `<fieldset class="gc-group"><legend>${esc(grp.title)}</legend>${grp.qs.map((q, i) => { const id = `${grp.key}-${i + 1}`; return `<label class="gc-q"><span class="gc-qt">${esc(q)}</span><textarea data-ans="${id}" rows="2" maxlength="800" placeholder="Your answer (optional)">${esc(play.answers[id] ?? "")}</textarea></label>`; }).join("")}</fieldset>`).join("");
      const nudges = `<div class="gc-nudges"><p class="gc-tiny">Need a nudge? <i>(optional)</i></p><div class="gc-nudge-row">${NUDGES.map((n, i) => `<button type="button" class="gc-chip gc-chip-add" data-act="nudge" data-i="${i}" data-nav aria-pressed="${i in ui.nudges}">${esc(n)}</button>`).join("")}</div>${NUDGES.map((n, i) => (i in ui.nudges ? `<label class="gc-q"><span class="gc-qt">${esc(n)}</span><textarea data-nudge="${i}" rows="2" maxlength="800" placeholder="Your answer (optional)">${esc(ui.nudges[i])}</textarea></label>` : "")).join("")}</div>`;
      const reveal = g === 1 ? `<button type="button" class="gc-ghost gc-sm" data-act="more" data-nav>Explore more of this future</button>` : g === 2 ? `<button type="button" class="gc-ghost gc-sm" data-act="more" data-nav>Explore tensions and consequences <i>(optional)</i></button>` : "";
      return `<div class="gc-scr">${hud("imagine")}
        <h2 class="gc-title" tabindex="-1">Imagine what it could mean</h2>
        <p class="gc-recap">${esc(sentence())}</p>
        <p class="gc-sub">Optional. Answer what you like and skip the rest.</p>
        ${shown}${reveal ? `<div class="gc-tools">${reveal}</div>` : ""}${nudges}
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="button" class="gc-go" data-act="create" data-nav data-primary>Create my scenario</button></div>
      </div>`;
    },

    describe() {
      const names = { title: "Title", idea: "The idea", difference: "The difference" };
      const hints = { title: "A short, memorable name for the imagined future.", idea: "One sentence about the future learning environment.", difference: "The main departure from present arrangements." };
      const field = (f) => `<div class="gc-fb"><div class="gc-fb-h"><label for="f-${f}">${names[f]}</label><button type="button" class="gc-ghost gc-sm" data-act="regen" data-field="${f}" data-nav aria-label="Regenerate ${names[f].toLowerCase()}">Regenerate</button></div><p class="gc-fine" id="h-${f}">${hints[f]}${play.edited.includes(f) ? " You have edited this." : ""}</p><textarea id="f-${f}" data-field="${f}" rows="${f === "title" ? 1 : 3}" maxlength="${f === "title" ? 120 : 400}" aria-describedby="h-${f}">${esc(play.scenario[f])}</textarea></div>`;
      return `<div class="gc-scr">${hud("describe")}
        <h2 class="gc-title" tabindex="-1">Describe your future</h2>
        <p class="gc-sub">Written from your cards and your words. Type to change anything; Regenerate gives new wording for that part only. This is an imagined future, not a prediction.</p>
        ${FIELDS.map(field).join("")}
        <div class="gc-tools"><button type="button" class="gc-ghost gc-sm" data-act="regen-all" data-nav>Regenerate all</button><button type="button" class="gc-ghost gc-sm" data-act="another" data-nav>Start another combination</button></div>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="button" class="gc-go" data-act="finish" data-nav data-primary>Finish and save</button></div>
      </div>`;
    },

    finish() {
      const s = sel();
      const thumbs = SLOTS.flatMap((x) => s[x.key].map((id) => cardOf(x.deck, id))).map((c) => `<li><img src="${c.sm}" alt="" width="300" height="525"></li>`).join("");
      const sc = play.scenario;
      return `<div class="gc-scr">${hud("finish")}
        <h2 class="gc-title" tabindex="-1">Thank you for imagining</h2>
        <article class="gc-result" aria-label="Your scenario">
          <h3>${esc(sc.title)}</h3>
          <p><b>The idea.</b> ${esc(sc.idea)}</p>
          <p><b>The difference.</b> ${esc(sc.difference)}</p>
          <ul class="gc-strip gc-strip-sm" aria-hidden="true">${thumbs}</ul>
        </article>
        <div class="gc-acts gc-acts-flow">
          <button type="button" class="gc-go" data-act="save-image" data-nav data-primary>Save my scenario</button>
          <button type="button" class="gc-ghost" data-act="copy" data-nav>Copy as text</button>
        </div>
        <p class="gc-mailmsg" id="save-msg" role="status"></p>

        <form class="gc-survey" novalidate aria-labelledby="sv-h">
          <h3 class="gc-tiny" id="sv-h">Two optional questions about the game</h3>
          <fieldset class="gc-field gc-scale"><legend id="post-l">Did this activity help you imagine possibilities for education that you had not considered before?</legend><div class="gc-scale-row" role="radiogroup" aria-labelledby="post-l">${[1, 2, 3, 4, 5].map((n) => `<label class="gc-radio gc-num"><input type="radio" name="post" value="${n}"${play.survey.post === n ? " checked" : ""}><span>${n}</span></label>`).join("")}</div><div class="gc-scale-ends" aria-hidden="true"><span>1 = Not at all</span><span>5 = A great deal</span></div></fieldset>
          <label class="gc-field gc-wide"><span>What was most useful, confusing, or missing in this activity?</span><textarea name="feedback" rows="3" maxlength="1000" placeholder="Your feedback (optional)">${esc(play.survey.feedback)}</textarea></label>
        </form>

        <details class="gc-fold gc-mailfold"><summary>Email me a copy <i>(optional)</i></summary>
        <form class="gc-mail" novalidate aria-label="Email me a copy">
          <p class="gc-sub">${esc(EMAIL_PURPOSE)}</p>
          <label class="gc-field"><span>Your email address</span><input type="email" name="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="you@gmail.com" value="${esc(play.player?.email ?? "")}"></label>
          <label class="gc-check"><input type="checkbox" name="consent"><span>Send me my scenario, and let the research team keep my email address.</span></label>
          <button type="submit" class="gc-ghost" data-nav>Email my scenario</button>
          <p class="gc-mailmsg" role="status"></p>
        </form>
        </details>
        <div class="gc-acts"><button type="button" class="gc-go" data-act="again" data-nav>Start another combination</button></div>
      </div>`;
    },
  };

  function render() {
    screen.innerHTML = screens[ui.step]();
    if (ui.step === "library") screen.querySelector('.gc-trk[aria-current="step"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }

  // ------------------------------------------------------------------ actions
  function start() {
    const keep = play && play.status === "started" && !countCards(sel());
    if (keep) { play.group = ui.group.trim().slice(0, 24); play.player = cleanPlayer(ui.profile); play.survey.pre = ui.pre; }
    else play = newPlay(ui.group, ui.profile, { pre: ui.pre });
    t0 = Date.now();
    ui.versions = [copySel(sel())]; ui.vcur = 0; ui.locked = {}; ui.clarity = 0; ui.groups = 1; ui.nudges = {};
    ui.gen = { title: 0, idea: 0, difference: 0 }; ui.draftKey = ""; ui.choose = null; ui.showDetails = false; ui.moreTools = false;
    persist();
    go("discover");
  }

  const logPick = (deck, id, extra = {}) => play.pickLog.push({ d: deck, c: id, t: Date.now() - t0, ...extra });

  function addCard(deck, id, { silent = false } = {}) {
    const slot = SLOT_BY_DECK[deck], list = sel()[slot.key];
    if (list.includes(id)) return true;
    if (slot.max === 1) { if (list.length) play.stats.swaps += 1; sel()[slot.key] = [id]; }
    else if (list.length < slot.max) list.push(id);
    else return false;
    logPick(deck, id);
    commit();
    if (!silent) navigator.vibrate?.(reduceMotion ? 0 : 12);
    return true;
  }
  function removeCard(deck, id) {
    const slot = SLOT_BY_DECK[deck];
    sel()[slot.key] = sel()[slot.key].filter((x) => x !== id);
    delete ui.locked[key(deck, id)];
    logPick(deck, id, { r: 1 });
    commit();
  }

  function newVersionFrom(next) {
    ui.versions = [...ui.versions.slice(0, ui.vcur + 1), copySel(next)];
    ui.vcur = ui.versions.length - 1;
    play.picks = copySel(next);
    commit();
  }

  function drawRandom() {
    const s = sel();
    const empty = SLOTS.some((x) => !s[x.key].length);
    if (empty) { play.picks = randomHand(s, ui.locked); play.stats.draws += 1; commit(); announce("Filled the empty gaps."); }
    else { newVersionFrom(randomHand(s, ui.locked, Math.random, { fresh: true })); play.stats.draws += 1; announce("A new combination."); }
  }

  function toDescribe() {
    const k = JSON.stringify([sel(), play.answers, ui.nudges]);
    if (k !== ui.draftKey) {
      const fresh = draftAll(sel(), play.answers, ui.gen);
      for (const f of FIELDS) if (!play.edited.includes(f) || !play.scenario[f]) play.scenario[f] = fresh[f];
      ui.draftKey = k;
    }
    play.nudges = Object.entries(ui.nudges).map(([i, a]) => ({ text: NUDGES[i], answer: a }));
    commit();
    go("describe");
  }

  function regen(field) {
    ui.gen[field] += 1;
    play.scenario[field] = draftField(field, sel(), play.answers, ui.gen[field]);
    play.edited = play.edited.filter((f) => f !== field);
    play.stats.regenerated += 1;
    persist();
    render();
    screen.querySelector(`#f-${field}`)?.focus();
    announce(`${field === "idea" ? "The idea" : field[0].toUpperCase() + field.slice(1)} rewritten.`);
  }

  function finish() {
    play.status = "completed";
    play.completedAt = new Date().toISOString();
    go("finish");   // adds the time spent on this step
    play.durations.total = Date.now() - new Date(play.startedAt).getTime();
    persist({ now: true });
  }

  const plainText = () => `${play.scenario.title}\n\n${sentence()}\n\nThe idea: ${play.scenario.idea}\nThe difference: ${play.scenario.difference}\n\nPedagogy Playcards`;

  async function saveImage(btn) {
    const msg = screen.querySelector("#save-msg");
    btn.disabled = true; msg.textContent = "Preparing your scenario…";
    try {
      const { makeScenarioPoster } = await import("../share.js");
      const blob = await makeScenarioPoster(play, SLOTS.flatMap((x) => sel()[x.key].map((id) => cardOf(x.deck, id))));
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "my-future-of-learning.png" });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      msg.textContent = "Saved to your device.";
    } catch { msg.textContent = "Sorry, that did not work. You can copy the text instead."; }
    btn.disabled = false;
  }

  async function copyText(btn) {
    const msg = screen.querySelector("#save-msg");
    try { await navigator.clipboard.writeText(plainText()); msg.textContent = "Copied."; }
    catch { msg.textContent = "Your browser would not allow copying. Select the text above and copy it."; }
    btn.focus();
  }

  // a styled confirm that works with the keyboard (native <dialog>)
  function ask(message, yes) {
    const dlg = document.getElementById("confirm");
    if (!dlg?.showModal) return Promise.resolve(window.confirm(message));
    dlg.querySelector("[data-msg]").textContent = message;
    dlg.querySelector("[data-yes]").textContent = yes;
    return new Promise((resolve) => {
      dlg.addEventListener("close", () => resolve(dlg.returnValue === "yes"), { once: true });
      dlg.returnValue = "no";
      dlg.showModal();
    });
  }

  async function another({ confirm = true } = {}) {
    if (confirm && !(await ask("Start another combination? The scenario you have written will not be kept unless you finish and save it.", "Start again"))) return;
    if (play.status !== "completed") persist({ now: true });
    const keepProfile = ui.profile;
    play = null; ui.profile = keepProfile;
    start();
  }

  function back() {
    if (ui.choose) { closeChooser(); return; }
    if (ui.step === "library") { go("discover"); return; }
    if (ui.step === "assemble") { go("discover"); return; }
    if (ui.step === "imagine") { go("assemble"); return; }
    if (ui.step === "describe") { go("imagine"); return; }
    if (ui.step === "discover" && !countCards(sel())) { go("you"); return; }
    if (ui.step === "discover") { go("assemble"); return; }
    if (ui.step === "you") location.assign("/");
  }

  // ------------------------------------------------------------------ events
  const focusAfter = (selector) => requestAnimationFrame(() => (ui.choose ? overlay : screen).querySelector(selector)?.focus({ preventScroll: false }));

  const onClick = (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return;
    const act = b.dataset.act, d = b.dataset;
    if (act === "draw") { play.picks = randomHand(emptySelection(), {}, Math.random, { fresh: true }); play.stats.mode = "random"; play.stats.draws += 1; ui.versions = [copySel(sel())]; ui.vcur = 0; commit(); go("assemble"); }
    else if (act === "choose") { play.stats.mode = "choose"; ui.libMode = "choose"; ui.libDeck = "issue"; go("library"); }
    else if (act === "explore") { play.stats.mode = play.stats.mode || "explore"; ui.libMode = "explore"; go("library"); }
    else if (act === "lib-deck") { ui.libDeck = d.deck; render(); focusAfter(`[data-act="lib-deck"][data-deck="${d.deck}"]`); }
    else if (act === "open-card") { const i = cardsOf(d.deck).findIndex((x) => x.id === d.id); openChooser(d.deck, i, `.gc-tile[data-id="${d.id}"]`); }
    else if (act === "remove-card") { removeCard(d.deck, d.id); render(); announce(`${cardOf(d.deck, d.id).name} removed.`); }
    else if (act === "to-assemble") { if (!countCards(sel())) { announce("Choose at least one card first."); openChooser(ui.libDeck, 0, `[data-act="to-assemble"]`); } else go("assemble"); }
    else if (act === "track") { ui.libDeck = d.deck; render(); focusAfter(`[data-act="track"][data-deck="${d.deck}"]`); }
    else if (act === "need") guideToMissing();
    else if (act === "skip") {
      const i = SLOTS.findIndex((x) => x.deck === ui.libDeck);
      const next = [...SLOTS.slice(i + 1), ...SLOTS.slice(0, i)].find((x) => !sel()[x.key].length);
      if (next) { ui.libDeck = next.deck; render(); announce(`${SLOT_BY_DECK[next.deck].ask}.`); focusAfter(".gc-deckhint"); } else go("assemble");
    }
    else if (act === "slot") { const slot = SLOTS.find((x) => x.key === d.slot); const first = sel()[slot.key][0]; openChooser(slot.deck, first ? cardsOf(slot.deck).findIndex((x) => x.id === first) : 0, `[data-act="slot"][data-slot="${slot.key}"]`); }
    else if (act === "ch-go") { paintDetail(+d.idx); }
    else if (act === "ch-prev" || act === "ch-next") { const n = cardsOf(ui.choose.deck).length; paintDetail((ui.choose.idx + (act === "ch-next" ? 1 : -1) + n) % n); overlay.querySelector(`[data-act="${act}"]`)?.focus({ preventScroll: true }); overlay.querySelector('.gc-ch-item[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" }); }
    else if (act === "ch-keep") { const { deck, idx } = ui.choose; const k = key(deck, cardsOf(deck)[idx].id); if (ui.locked[k]) delete ui.locked[k]; else { ui.locked[k] = true; play.stats.locks += 1; } paintDetail(idx); overlay.querySelector('[data-act="ch-keep"]')?.focus({ preventScroll: true }); announce(ui.locked[k] ? "This card will stay when you shuffle." : "This card can change when you shuffle."); }
    else if (act === "ch-choose") chooseCurrent();
    else if (act === "ch-done") closeChooser();
    else if (act === "lock") {
      const k = key(d.deck, d.id); ui.locked[k] = !ui.locked[k]; if (!ui.locked[k]) delete ui.locked[k]; else play.stats.locks += 1;
      render(); focusAfter(`.gc-lock[data-id="${d.id}"]`); announce(ui.locked[k] ? "Card locked." : "Card unlocked.");
    }
    else if (act === "random") { drawRandom(); render(); focusAfter('[data-act="random"]'); }
    else if (act === "clarify") { if (guideToMissing()) return; ui.clarity = (ui.clarity % CLEAR_VARIANTS) + 1; play.stats.clarified += 1; commit(); render(); focusAfter('[data-act="unclarify"]'); announce("Clearer wording shown. Your cards have not changed."); }
    else if (act === "unclarify") { ui.clarity = 0; commit(); render(); focusAfter('[data-act="clarify"]'); }
    else if (act === "version") { if (guideToMissing()) return; newVersionFrom(randomHand(sel(), ui.locked, Math.random, { fresh: true })); render(); focusAfter('[data-act="version"]'); announce(`Version ${ui.vcur + 1}. Your earlier version is kept.`); }
    else if (act === "ver-prev" || act === "ver-next") { ui.vcur += act === "ver-next" ? 1 : -1; play.picks = copySel(ui.versions[ui.vcur]); commit(); render(); focusAfter(`[data-act="${act}"]`); announce(`Version ${ui.vcur + 1} of ${ui.versions.length}.`); }
    else if (act === "more-tools") { ui.moreTools = !ui.moreTools; render(); focusAfter('[data-act="more-tools"]'); }
    else if (act === "details") { ui.showDetails = !ui.showDetails; render(); if (ui.showDetails) focusAfter("[data-details]"); }
    else if (act === "continue") { if (guideToMissing()) return; play.sentence = sentence(); commit(); go("imagine"); }
    else if (act === "more") { ui.groups = Math.min(3, ui.groups + 1); render(); focusAfter(`.gc-group:nth-of-type(${ui.groups}) textarea`); }
    else if (act === "nudge") { const i = +d.i; if (i in ui.nudges) delete ui.nudges[i]; else ui.nudges[i] = ""; render(); focusAfter(i in ui.nudges ? `[data-nudge="${i}"]` : `[data-act="nudge"][data-i="${i}"]`); }
    else if (act === "create") toDescribe();
    else if (act === "regen") regen(d.field);
    else if (act === "regen-all") {
      for (const f of FIELDS) if (!play.edited.includes(f)) { ui.gen[f] += 1; play.scenario[f] = draftField(f, sel(), play.answers, ui.gen[f]); }
      play.stats.regenerated += 1; persist(); render(); announce("Rewritten. Parts you edited were kept.");
    }
    else if (act === "another") another();
    else if (act === "again") another({ confirm: false });
    else if (act === "finish") finish();
    else if (act === "save-image") saveImage(b);
    else if (act === "copy") copyText(b);
    else if (act === "back") back();
  };
  screen.addEventListener("click", onClick);
  overlay.addEventListener("click", onClick);

  // pointing at or focusing a name in the chooser shows that card large
  const preview = (e) => {
    const b = e.target.closest?.(".gc-ch-item");
    if (!b || !ui.choose || +b.dataset.idx === ui.choose.idx) return;
    if (e.type === "pointerover" && overlay.querySelector("[data-detail]").contains(document.activeElement)) return;
    paintDetail(+b.dataset.idx);
  };
  overlay.addEventListener("pointerover", preview);
  overlay.addEventListener("focusin", preview);

  // forms: about you, survey, email
  async function sendReport(f) {
    const msg = f.querySelector(".gc-mailmsg"), btn = f.querySelector("button");
    const email = f.email.value.trim();
    if (!email || !f.email.checkValidity()) { msg.textContent = "Please enter a valid email address."; f.email.focus(); return; }
    if (!f.consent.checked) { msg.textContent = "Please tick the box to agree."; f.consent.focus(); return; }
    btn.disabled = true; msg.textContent = "Sending…";
    play.player = { ...cleanPlayer(play.player), email: email.toLowerCase() };
    persist({ now: true });
    try {
      const res = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ play, email, consent: true }) });
      const body = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => ({})) : {};
      if (res.ok && body.sent) msg.textContent = `Sent to ${email}. If you do not see it, look in your spam folder.`;
      else if (res.ok) msg.textContent = "We have your address, but email sending is not switched on yet, so nothing was sent. You can still save your scenario.";
      else if (res.status === 400 || res.status === 429) msg.textContent = body.error || "That did not work. Please check the address.";
      else msg.textContent = "We could not send it just now. You can try again, or save your scenario.";
    } catch { msg.textContent = "We could not reach the server. Check your connection and try again."; }
    finally { btn.disabled = false; }
  }

  screen.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.classList.contains("gc-mail")) { sendReport(f); return; }
    if (f.classList.contains("gc-survey")) return;
    const v = { name: f.name.value, age: f.age.value, gender: f.gender.value };
    const err = screen.querySelector("#you-err");
    if (!v.age || !v.gender) {
      const what = !v.age && !v.gender ? "your age and your gender" : !v.age ? "your age" : "your gender";
      err.textContent = `Please choose ${what} (you can choose “Prefer not to say”).`;
      (!v.age ? f.age : f.querySelector('[name="gender"]')).focus();
      return;
    }
    ui.profile = cleanPlayer(v);
    ui.group = f.group.value;
    ui.pre = f.pre.value ? Number(f.pre.value) : null;
    start();
  });

  let typing;
  const later = () => { clearTimeout(typing); typing = setTimeout(() => persist(), 600); };
  screen.addEventListener("input", (e) => {
    const t = e.target;
    if (ui.step === "you") return;
    if (!play) return;
    if (t.matches("[data-details]")) play.details = t.value;
    else if (t.matches("[data-ans]")) play.answers[t.dataset.ans] = t.value;
    else if (t.matches("[data-nudge]")) ui.nudges[+t.dataset.nudge] = t.value;
    else if (t.matches("textarea[data-field]")) {
      const f = t.dataset.field;
      play.scenario[f] = t.value;
      if (!play.edited.includes(f)) { play.edited.push(f); const h = screen.querySelector(`#h-${f}`); if (h && !h.textContent.includes("You have edited")) h.textContent += " You have edited this."; }
    }
    else if (t.name === "feedback") play.survey.feedback = t.value;
    else return;
    later();
  });
  screen.addEventListener("change", (e) => {
    const t = e.target;
    if (ui.step === "finish" && t.name === "post") { play.survey.post = Number(t.value); persist(); }
  });

  // keep an unfinished play: flush when the page is hidden or closed
  addEventListener("pagehide", () => { if (play && play.status !== "completed") { leaveStep(); ui.stepAt = Date.now(); persist({ beacon: true }); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && play && play.status !== "completed") persist({ beacon: true }); });

  // ---- console controls: arrow keys / D-pad move between choices, A selects, B goes back
  function move(dir) {
    const scope = ui.choose ? overlay : screen;
    const items = [...scope.querySelectorAll("[data-nav]")].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const cur = items.includes(document.activeElement) ? document.activeElement : null;
    if (!cur) { items[0].focus(); return; }
    const c = cur.getBoundingClientRect();
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const ok = dir === "right" ? dx > 4 : dir === "left" ? dx < -4 : dir === "down" ? dy > 4 : dy < -4;
      if (!ok) continue;
      const along = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
      const across = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    best?.focus();
  }

  function press(a) {
    if (a === "ok") {
      const scope = ui.choose ? overlay : screen;
      const el = scope.contains(document.activeElement) && document.activeElement.matches("[data-nav]") ? document.activeElement : scope.querySelector("[data-primary]:not([disabled])");
      el?.click();
    } else if (a === "back") back();
    else move(a);
  }

  root.querySelector(".gc-pad")?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pad]");
    if (b) press(b.dataset.pad);
  });

  root.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const typingNow = /^(input|textarea|select)$/i.test(e.target.tagName);
    const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (map[e.key] && !typingNow) { e.preventDefault(); move(map[e.key]); }
    else if (e.key === "Escape") { e.preventDefault(); back(); }
  });

  root.dataset.step = ui.step;
  render();
}
