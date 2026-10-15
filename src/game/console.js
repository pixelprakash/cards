// The game console (the /play page).
// Flow: start -> choose a challenge (an Issue card) -> fill four blanks with cards -> generated questions -> done.
// Every play is recorded through ./store.js for the researcher view.

import { DECKS, DECK_ORDER, cardFace, cardBack, titleOf } from "../cards-data.js";
import { CHALLENGE_DECK, SLOTS, STEPS, SAY, SENTENCE, PROMPT_ASK, AGE_BANDS, GENDERS, CONSENT } from "./config.js";
import { generateQuestions } from "./questions.js";
import { newPlay, save, loadLocal, cleanPlayer } from "./store.js";

const root = document.getElementById("console");
const screen = document.getElementById("screen");
if (root && screen) init();

function init() {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cardsOf = (deck) => DECKS[deck].cards.filter((c) => !c.mine);
  const byId = (deck, id) => DECKS[deck].cards.find((c) => c.id === id);
  const say = (card) => SAY[card.id] ?? titleOf(card).toLowerCase();

  const ui = { step: "start", slot: SLOTS[0].key, group: "", profile: null, stepAt: Date.now() };   // profile lives in memory only, so the next person on a shared device starts blank
  let play = null;
  let t0 = Date.now();
  let questionsKey = "";

  // ------------------------------------------------------------------ helpers
  const hud = (step) => {
    const at = STEPS.findIndex((s) => s.key === step);
    return `<ol class="gc-hud" aria-label="Progress">${STEPS.map((s, i) => `<li class="${i < at ? "is-done" : ""}${i === at ? " is-on" : ""}"${i === at ? ' aria-current="step"' : ""}><span class="n">${i + 1}</span><span class="l">${s.label}</span></li>`).join("")}</ol>`;
  };
  const filled = () => SLOTS.every((s) => play.picks[s.key]);
  const nextEmpty = () => SLOTS.find((s) => !play.picks[s.key])?.key;

  function persist(opts) { if (play) save(play, opts); }

  function leaveStep() {
    if (!play) return;
    const k = ui.step;
    if (k === "challenge" || k === "blanks" || k === "questions") play.durations[k] = (play.durations[k] || 0) + (Date.now() - ui.stepAt);
  }

  function go(step, { focus = true } = {}) {
    leaveStep();
    ui.step = step;
    ui.stepAt = Date.now();
    root.dataset.step = step;
    if (play && step !== "done" && step !== "start") play.status = step === "challenge" ? "started" : step;
    render();
    screen.scrollTop = 0;
    if (focus) screen.querySelector(".gc-title")?.focus({ preventScroll: true });
    if (!reduceMotion) { screen.classList.remove("swap"); void screen.offsetWidth; screen.classList.add("swap"); }
  }

  // ------------------------------------------------------------------ screens
  function sentenceHTML() {
    return SENTENCE.map((part) => {
      if (typeof part === "string") return esc(part);
      if (part.slot === "challenge") {
        const c = byId(CHALLENGE_DECK, play.challenge);
        return `<span class="gc-blank is-fixed" data-deck="issue">${esc(say(c))}</span>`;
      }
      const slot = SLOTS.find((s) => s.key === part.slot);
      const id = play.picks[slot.key];
      const card = id && byId(slot.deck, id);
      return `<button type="button" class="gc-blank${ui.slot === slot.key ? " is-active" : ""}${card ? " is-filled" : ""}" data-deck="${slot.deck}" data-act="slot" data-slot="${slot.key}" data-nav>${card ? esc(say(card)) : `<span class="ph">${esc(slot.label.toLowerCase())}</span>`}</button>`;
    }).join("");
  }

  function trayHTML() {
    const slot = SLOTS.find((s) => s.key === ui.slot);
    return cardsOf(slot.deck).map((c) => {
      const on = play.picks[slot.key] === c.id;
      return `<button type="button" class="gc-pick" data-act="pick" data-slot="${slot.key}" data-id="${c.id}" data-nav aria-pressed="${on}" aria-label="${esc(DECKS[slot.deck].noun)}: ${esc(titleOf(c))}">${cardFace(slot.deck, c, { tag: "span", sizes: "140px", attrs: ' aria-hidden="true"' })}</button>`;
    }).join("");
  }

  function actsBlanksHTML() {
    return `<button type="button" class="gc-ghost" data-act="back" data-nav>Back</button>
      <button type="button" class="gc-ghost" data-act="draw" data-nav>Draw for me</button>
      <button type="button" class="gc-ghost" data-act="shuffle" data-nav>Shuffle all</button>
      <button type="button" class="gc-go" data-act="next" data-nav data-primary${filled() ? "" : " disabled"}>Write the questions</button>`;
  }

  function askHTML() {
    const slot = SLOTS.find((s) => s.key === ui.slot);
    const n = SLOTS.filter((s) => play.picks[s.key]).length;
    return `${esc(slot.ask)} <span class="gc-count">${n} of ${SLOTS.length} filled</span>`;
  }

  const screens = {
    start() {
      return `<div class="gc-scr gc-hero">
        <div class="gc-hero-text">
        <p class="gc-kicker">A toolkit for reimagining the future of learning</p>
        <h2 class="gc-title gc-title-xl" tabindex="-1">How could we reimagine education radically?</h2>
        <ol class="gc-how">
          <li><b>Choose a challenge</b> from the Issue cards.</li>
          <li><b>Fill the blanks</b> with a force, a value, a method and a place.</li>
          <li><b>Answer the questions</b> the game writes from your choices.</li>
        </ol>
        <button type="button" class="gc-go gc-start" data-act="start" data-nav data-primary>Press start</button>
        </div>
        <div class="gc-fan" aria-hidden="true">${DECK_ORDER.map((d, i) => `<span class="gc-fan-c" style="--i:${i}">${cardBack(d)}</span>`).join("")}</div>
      </div>`;
    },

    you() {
      const pr = ui.profile || {};
      return `<form class="gc-scr gc-you" novalidate>
        <p class="gc-kicker">Before you start</p>
        <h2 class="gc-title" tabindex="-1">A little about you</h2>
        <p class="gc-sub">It helps the researchers see who is playing. It takes ten seconds.</p>
        <div class="gc-fields">
          <label class="gc-field"><span>Your name <i>(optional)</i></span><input name="name" maxlength="40" autocomplete="name" value="${esc(pr.name)}"></label>
          <label class="gc-field"><span>Your age</span><select name="age" aria-describedby="you-err" required><option value="">Choose one</option>${AGE_BANDS.map((a) => `<option value="${a.id}"${pr.age === a.id ? " selected" : ""}>${a.label}</option>`).join("")}</select></label>
          <fieldset class="gc-field gc-radios"><legend>Your gender</legend>
            ${GENDERS.map((g) => `<label class="gc-radio"><input type="radio" name="gender" value="${g.id}"${pr.gender === g.id ? " checked" : ""}><span>${g.label}</span></label>`).join("")}
          </fieldset>
          <label class="gc-field"><span>Group or workshop code <i>(optional)</i></span><input name="group" maxlength="24" autocomplete="off" value="${esc(ui.group)}"></label>
        </div>
        <p class="gc-err" id="you-err" role="alert"></p>
        <p class="gc-fine">${esc(CONSENT)}</p>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="submit" class="gc-go" data-nav data-primary>Start playing</button></div>
      </form>`;
    },

    challenge() {
      const sel = play.challenge && byId(CHALLENGE_DECK, play.challenge);
      return `<div class="gc-scr">${hud("challenge")}
        <h2 class="gc-title" tabindex="-1">Choose your challenge</h2>
        <p class="gc-sub">Each Issue card names a problem. Pick the one you want to tackle.</p>
        <div class="gc-picks" role="group" aria-label="Challenges">
          ${cardsOf(CHALLENGE_DECK).map((c) => `<button type="button" class="gc-pick" data-act="challenge" data-id="${c.id}" data-nav aria-pressed="${play.challenge === c.id}" aria-label="${esc(DECKS.issue.noun)}: ${esc(titleOf(c))}">${cardFace("issue", c, { tag: "span", sizes: "200px", attrs: ' aria-hidden="true"' })}</button>`).join("")}
        </div>
        <p class="gc-detail" data-detail>${sel ? `<b>${esc(titleOf(sel))}.</b> ${esc(sel.desc)}` : "Select a card to read it."}</p>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="button" class="gc-go" data-act="lock" data-nav data-primary${sel ? "" : " disabled"}>Lock in this challenge</button></div>
      </div>`;
    },

    blanks() {
      const c = byId(CHALLENGE_DECK, play.challenge);
      const slot = SLOTS.find((s) => s.key === ui.slot);
      const cur = play.picks[slot.key] && byId(slot.deck, play.picks[slot.key]);
      return `<div class="gc-scr">${hud("blanks")}
        <div class="gc-blanks">
          <div class="gc-side"><p class="gc-tiny">Your challenge</p>${cardFace("issue", c, { tag: "div", sizes: "150px", cls: "gc-mini" })}</div>
          <div class="gc-main">
            <h2 class="gc-title" tabindex="-1">Fill the blanks</h2>
            <p class="gc-sentence" data-sentence>${sentenceHTML()}</p>
            <p class="gc-ask" data-ask>${askHTML()}</p>
            <div class="gc-tray" data-tray role="group" aria-label="${esc(slot.label)} cards">${trayHTML()}</div>
            <p class="gc-detail" data-detail>${cur ? `<b>${esc(titleOf(cur))}.</b> ${esc(cur.desc ?? "")}` : "Select a card to read it."}</p>
            <div class="gc-acts" data-acts>${actsBlanksHTML()}</div>
          </div>
        </div>
      </div>`;
    },

    questions() {
      return `<div class="gc-scr">${hud("questions")}
        <h2 class="gc-title" tabindex="-1">Questions for your hand</h2>
        <p class="gc-sub">The game wrote these from the cards you chose. <b>${esc(sentenceText())}</b> Answer what you like; every answer is optional.</p>
        <ol class="gc-qs">${play.questions.map((q, i) => `<li class="gc-q"><label for="gq-${i}"><span class="gc-qa">${esc(q.angle)}</span><span class="gc-qt">${esc(q.text)}</span></label><textarea id="gq-${i}" data-q="${i}" rows="2" maxlength="600" placeholder="Your answer">${esc(q.answer ?? "")}</textarea></li>`).join("")}
          <li class="gc-q gc-q-prompt"><label for="gq-prompt"><span class="gc-qa">Your prompt</span><span class="gc-qt">${esc(PROMPT_ASK)}</span></label><textarea id="gq-prompt" data-prompt rows="3" maxlength="300" placeholder="Describe it in a few vivid sentences">${esc(play.prompt)}</textarea></li>
        </ol>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="back" data-nav>Back</button><button type="button" class="gc-go" data-act="finish" data-nav data-primary>Finish game</button></div>
      </div>`;
    },

    done() {
      const answered = play.questions.filter((q) => (q.answer || "").trim()).length;
      return `<div class="gc-scr">${hud("done")}
        <h2 class="gc-title" tabindex="-1">Game complete</h2>
        <p class="gc-sub">${esc(sentenceText())}</p>
        <div class="gc-row" aria-label="Your cards">
          ${[["issue", play.challenge], ...SLOTS.map((s) => [s.deck, play.picks[s.key]])].map(([d, id]) => cardFace(d, byId(d, id), { tag: "div", sizes: "120px", cls: "gc-thumb" })).join("")}
        </div>
        <p class="gc-detail">You answered ${answered} of ${play.questions.length} questions${play.prompt.trim() ? " and wrote a prompt" : ""}. Your play was recorded for the researchers.</p>
        <div class="gc-acts"><button type="button" class="gc-ghost" data-act="save-image" data-nav>Save as image</button><button type="button" class="gc-go" data-act="again" data-nav data-primary>Play again</button></div>
        <form class="gc-mail" novalidate aria-labelledby="mail-h">
          <h3 class="gc-tiny" id="mail-h">Get your report by email</h3>
          <p class="gc-sub">We will send your cards, your questions and your answers to your inbox.</p>
          <label class="gc-field"><span>Your email address</span><input type="email" name="email" autocomplete="email" inputmode="email" maxlength="120" placeholder="you@gmail.com" value="${esc(play.player?.email ?? "")}"></label>
          <label class="gc-check"><input type="checkbox" name="consent"><span>Send me my report, and let the research team keep my email address.</span></label>
          <button type="submit" class="gc-ghost" data-nav>Email my report</button>
          <p class="gc-mailmsg" role="status"></p>
        </form>
      </div>`;
    },
  };

  function sentenceText() {
    return SENTENCE.map((p) => {
      if (typeof p === "string") return p;
      if (p.slot === "challenge") return say(byId(CHALLENGE_DECK, play.challenge));
      const s = SLOTS.find((x) => x.key === p.slot);
      return say(byId(s.deck, play.picks[s.key]));
    }).join("");
  }

  function render() { screen.innerHTML = screens[ui.step](); }

  // ------------------------------------------------------------------ actions
  function startGame() {
    if (play && play.status === "started" && !play.challenge) { play.group = ui.group.trim().slice(0, 24); play.player = cleanPlayer(ui.profile); }   // backed out: same play
    else play = newPlay(ui.group, ui.profile);
    t0 = Date.now();
    ui.slot = SLOTS[0].key;
    persist();
    go("challenge");
  }

  // `auto` marks a card the game drew for the player; only the player's own changes count as swaps.
  function pickCard(slotKey, id, { silent = false, auto = false } = {}) {
    const prev = play.picks[slotKey];
    if (prev === id) return;
    if (prev && !auto) play.swaps += 1;
    play.picks[slotKey] = id;
    play.pickLog.push({ s: slotKey, c: id, t: Date.now() - t0, ...(auto && { a: 1 }) });
    persist();
    if (!auto && !reduceMotion) navigator.vibrate?.(12);   // a light tick on phones that support it
    if (silent) return;
    ui.slot = nextEmpty() ?? slotKey;
    refreshBlanks();
  }

  function refreshBlanks({ keepFocus = true } = {}) {
    const q = (s) => screen.querySelector(s);
    q("[data-sentence]").innerHTML = sentenceHTML();
    q("[data-ask]").innerHTML = askHTML();
    const tray = q("[data-tray]");
    tray.innerHTML = trayHTML();
    const slot = SLOTS.find((s) => s.key === ui.slot);
    tray.setAttribute("aria-label", `${slot.label} cards`);
    q("[data-acts]").innerHTML = actsBlanksHTML();
    const cur = play.picks[slot.key] && byId(slot.deck, play.picks[slot.key]);
    q("[data-detail]").innerHTML = cur ? `<b>${esc(titleOf(cur))}.</b> ${esc(cur.desc ?? "")}` : "Select a card to read it.";
    if (keepFocus) (tray.querySelector('[aria-pressed="true"]') || tray.querySelector("button"))?.focus({ preventScroll: true });
    const on = tray.querySelector('[aria-pressed="true"]');
    on?.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }

  const randomFrom = (list, not) => {
    const pool = list.length > 1 ? list.filter((c) => c.id !== not) : list;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  function draw() {
    const slot = SLOTS.find((s) => s.key === ui.slot);
    play.draws += 1;
    pickCard(slot.key, randomFrom(cardsOf(slot.deck), play.picks[slot.key]).id, { auto: true });
  }

  function shuffleAll() {
    play.draws += 1;
    SLOTS.forEach((s) => pickCard(s.key, randomFrom(cardsOf(s.deck), play.picks[s.key]).id, { silent: true, auto: true }));
    ui.slot = SLOTS[0].key;
    refreshBlanks();
  }

  function toQuestions() {
    if (!filled()) return;
    const sel = { challenge: play.challenge, ...play.picks };
    const key = JSON.stringify(sel);
    if (!play.questions.length || questionsKey !== key) {   // new questions only when the hand changed
      play.questions = generateQuestions(sel).map((q) => ({ id: q.id, angle: q.angle, text: q.text, answer: "" }));
      questionsKey = key;
    }
    persist({ now: true });
    go("questions");
  }

  function finish() {
    leaveStep();
    play.status = "completed";
    play.completedAt = new Date().toISOString();
    play.durations.total = Date.now() - t0;
    persist({ now: true });
    ui.step = "done";
    ui.stepAt = Date.now();
    root.dataset.step = "done";
    render();
    screen.querySelector(".gc-title")?.focus({ preventScroll: true });
    if (!reduceMotion) { screen.classList.remove("swap"); void screen.offsetWidth; screen.classList.add("swap"); }
  }

  async function saveImage(btn) {
    if (btn.getAttribute("aria-busy")) return;
    btn.setAttribute("aria-busy", "true");
    try {
      const cards = [["issue", play.challenge], ...SLOTS.map((s) => [s.deck, play.picks[s.key]])].map(([deck, id]) => ({ deck, card: byId(deck, id) }));
      const { makePoster } = await import("../share.js");
      const n = loadLocal().filter((p) => p.status === "completed").length;
      const blob = await makePoster(cards, play.prompt.trim(), n);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: "pedagogy-playcards-game.png" });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { /* the game result stays on screen */ }
    btn.removeAttribute("aria-busy");
  }

  function back() {
    if (ui.step === "you") { go("start"); return; }
    if (ui.step === "challenge") { go("you"); return; }
    if (ui.step === "blanks") { go("challenge"); return; }
    if (ui.step === "questions") { go("blanks"); return; }
  }

  // ------------------------------------------------------------------ events
  screen.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === "start") go("you");
    else if (act === "challenge") {
      play.challenge = b.dataset.id;
      persist();
      screen.querySelectorAll('[data-act="challenge"]').forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const c = byId(CHALLENGE_DECK, b.dataset.id);
      screen.querySelector("[data-detail]").innerHTML = `<b>${esc(titleOf(c))}.</b> ${esc(c.desc)}`;
      screen.querySelector('[data-act="lock"]').disabled = false;
    }
    else if (act === "lock") { play.status = "blanks"; persist({ now: true }); ui.slot = nextEmpty() ?? SLOTS[0].key; go("blanks"); }
    else if (act === "slot") { ui.slot = b.dataset.slot; refreshBlanks({ keepFocus: false }); screen.querySelector("[data-tray] button")?.focus({ preventScroll: true }); }
    else if (act === "pick") pickCard(b.dataset.slot, b.dataset.id);
    else if (act === "draw") draw();
    else if (act === "shuffle") shuffleAll();
    else if (act === "next") toQuestions();
    else if (act === "finish") finish();
    else if (act === "again") { play = null; questionsKey = ""; startGame(); }   // same person: no need to ask again
    else if (act === "save-image") saveImage(b);
    else if (act === "back") back();
  });

  // emailing the report: the server builds it from the saved play, so only the address and consent are ours to send
  async function sendReport(f) {
    const msg = f.querySelector(".gc-mailmsg"), btn = f.querySelector("button");
    const email = f.email.value.trim();
    if (!email || !f.email.checkValidity()) { msg.textContent = "Please enter a valid email address."; f.email.focus(); return; }
    if (!f.consent.checked) { msg.textContent = "Please tick the box to agree."; f.consent.focus(); return; }
    btn.disabled = true;
    msg.textContent = "Sending…";
    play.player = { ...cleanPlayer(play.player), email: email.toLowerCase() };
    persist({ now: true });
    try {
      const res = await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ play, email, consent: true }) });
      const body = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => ({})) : {};
      if (res.ok && body.sent) msg.textContent = `Sent to ${email}. If you do not see it, look in your spam folder.`;
      else if (res.ok) msg.textContent = "We have your address, but email sending is not switched on yet, so no report went out. You can still save your report as an image.";
      else if (res.status === 400 || res.status === 429) msg.textContent = body.error || "That did not work. Please check the address.";
      else msg.textContent = "We could not send it just now. You can try again, or save your report as an image.";
    } catch {
      msg.textContent = "We could not reach the server. Check your connection and try again, or save your report as an image.";
    } finally { btn.disabled = false; }
  }

  // the "about you" form
  screen.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.classList.contains("gc-mail")) { sendReport(f); return; }
    const v = { name: f.name.value, age: f.age.value, gender: f.gender.value };
    const err = screen.querySelector("#you-err");
    if (!v.age || !v.gender) {
      err.textContent = !v.age && !v.gender ? "Please choose your age and your gender (you can choose \u201cPrefer not to say\u201d)." : !v.age ? "Please choose your age (you can choose \u201cPrefer not to say\u201d)." : "Please choose your gender (you can choose \u201cPrefer not to say\u201d).";
      (!v.age ? f.age : f.querySelector('[name="gender"]')).focus();
      return;
    }
    ui.profile = cleanPlayer(v);
    ui.group = f.group.value;
    startGame();
  });

  // read a card in full while hovering or focusing it
  const showDetail = (e) => {
    const b = e.target.closest?.(".gc-pick");
    const d = screen.querySelector("[data-detail]");
    if (!b || !d) return;
    const slotKey = b.dataset.slot;
    const deck = slotKey ? SLOTS.find((s) => s.key === slotKey).deck : CHALLENGE_DECK;
    const c = byId(deck, b.dataset.id);
    if (c) d.innerHTML = `<b>${esc(titleOf(c))}.</b> ${esc(c.desc ?? "")}`;
  };
  screen.addEventListener("pointerover", showDetail);
  screen.addEventListener("focusin", showDetail);

  let typing;
  screen.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[name=group]")) { ui.group = t.value; return; }
    if (ui.step === "you") return;
    if (!play) return;
    if (t.matches("[data-q]")) play.questions[+t.dataset.q].answer = t.value;
    else if (t.matches("[data-prompt]")) play.prompt = t.value;
    else return;
    clearTimeout(typing);
    typing = setTimeout(() => persist(), 600);
  });

  // keep an unfinished play: flush when the page is hidden or closed
  addEventListener("pagehide", () => { if (play && play.status !== "completed") { leaveStep(); ui.stepAt = Date.now(); persist({ beacon: true }); } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && play && play.status !== "completed") persist({ beacon: true }); });

  // ---- console controls: arrow keys / D-pad move between choices, A selects, B goes back
  function move(dir) {
    const items = [...screen.querySelectorAll("[data-nav]")].filter((el) => !el.disabled && el.offsetParent !== null);
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
      const el = screen.contains(document.activeElement) && document.activeElement.matches("[data-nav]") ? document.activeElement : screen.querySelector("[data-primary]:not([disabled])");
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

  render();
}
