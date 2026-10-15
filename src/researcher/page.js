// Researcher view: reads plays (this browser, the shared database, or labelled sample data) and draws the metrics.
// Everything is built from numbers and escaped text, so a player's written answer can never run as markup.

import { loadLocal } from "../game/store.js";
import { computeMetrics, crossTab, filterPlays, toCSV, samplePlays, DIMENSIONS, comboLabel } from "./metrics.js";
import { AGE_BANDS, GENDERS } from "../game/config.js";

const $ = (s) => document.querySelector(s);
const out = $("#out");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const pct = (n, d = 0) => (n == null ? "–" : `${(n * 100).toFixed(d)}%`);
const num1 = (n) => (n == null ? "–" : (Math.round(n * 10) / 10).toString());
const fmtDur = (ms) => {
  if (ms == null) return "–";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
};
const when = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const day = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const state = { note: "", source: "local", plays: [], sample: samplePlays(), shared: null, filters: { days: 0, challenge: "", group: "", age: "", gender: "" }, cross: { row: "challenge", col: "methods" } };

// ---------------------------------------------------------------- data sources
class Unauthorised extends Error {}

async function api(path, init) {
  const res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  const type = res.headers.get("content-type") || "";
  const body = type.includes("json") ? await res.json().catch(() => ({})) : null;
  return { res, body };
}

async function loadShared() {
  const { res, body } = await api("/api/plays");
  if (res.status === 401) throw new Unauthorised();
  if (res.status === 503) throw new Error("The shared database is not connected yet, so this shows the plays saved in this browser.");
  if (!res.ok || !body) throw new Error("The shared database could not be reached, so this shows the plays saved in this browser.");
  return body.plays || [];
}

const current = () => (state.source === "sample" ? state.sample : state.source === "shared" ? state.shared : state.plays);

function sourceBanner() {
  const n = current().length;
  const el = $("#source");
  const text = {
    local: `Showing ${n} ${n === 1 ? "play" : "plays"} saved in this browser only.${state.note ? "" : " Other players' plays appear once the shared database is connected."}`,
    shared: `Showing ${n} ${n === 1 ? "play" : "plays"} from every player (shared database).`,
    sample: `Sample data. These ${n} plays are invented to show what this page does. They are not real.`,
  }[state.source];
  el.dataset.kind = state.source;
  el.textContent = text + (state.note ? ` ${state.note}` : "");
}

// ---------------------------------------------------------------- small chart pieces
const bar = (label, value, max, { sub = "", over = null, note = "" } = {}) => {
  const w = max ? (value / max) * 100 : 0;
  const ow = over != null && max ? (over / max) * 100 : null;
  return `<li class="row"><span class="lab">${esc(label)}</span><span class="track" aria-hidden="true"><i class="fill light" style="width:${w}%"></i>${ow != null ? `<i class="fill dark" style="width:${ow}%"></i>` : ""}</span><span class="val">${esc(sub || value)}${note ? ` <small>${esc(note)}</small>` : ""}</span></li>`;
};

const card = (title, body, { wide = false, id = "", hint = "" } = {}) =>
  `<section class="panel${wide ? " wide" : ""}"${id ? ` id="${id}"` : ""}><h2>${esc(title)}</h2>${hint ? `<p class="hint">${esc(hint)}</p>` : ""}${body}</section>`;

const legend = (...items) => `<ul class="legend" aria-label="Legend">${items.map(([cls, t]) => `<li><i class="sw ${cls}" aria-hidden="true"></i>${esc(t)}</li>`).join("")}</ul>`;

const kpi = (value, label, note = "") => `<div class="kpi"><p class="kv">${esc(value)}</p><p class="kl">${esc(label)}</p>${note ? `<p class="kn">${esc(note)}</p>` : ""}</div>`;

function perDayChart(rows) {
  if (!rows.length) return `<p class="empty">No plays in this period.</p>`;
  const max = Math.max(...rows.map((r) => r.started));
  const cols = rows.map((r) => `<li class="col" title="${esc(day(r.day))}: ${r.started} started, ${r.completed} finished"><span class="stack" aria-hidden="true"><i class="fill light" style="height:${(r.started / max) * 100}%"></i><i class="fill dark" style="height:${(r.completed / max) * 100}%"></i></span></li>`).join("");
  const table = `<details class="tv"><summary>View as table</summary><table><thead><tr><th scope="col">Day</th><th scope="col">Started</th><th scope="col">Finished</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${esc(day(r.day))}</th><td>${r.started}</td><td>${r.completed}</td></tr>`).join("")}</tbody></table></details>`;
  return `${legend(["light", "Started"], ["dark", "Finished"])}<div class="cols" role="img" aria-label="Plays per day, from ${esc(day(rows[0].day))} to ${esc(day(rows.at(-1).day))}. Busiest day: ${max} plays started.">${`<ul>${cols}</ul>`}</div><p class="axis"><span>${esc(day(rows[0].day))}</span><span>Busiest day: ${max}</span><span>${esc(day(rows.at(-1).day))}</span></p>${table}`;
}

function timeChart(t) {
  const max = Math.max(0, ...t.bins.map((b) => b.count));
  if (!max) return `<p class="empty">No finished plays yet.</p>`;
  const lab = (b) => (b.to === Infinity ? `${b.from / 60000}+ min` : `${b.from / 60000}–${b.to / 60000} min`);
  return `<ul class="cols hist" role="list">${t.bins.map((b) => `<li class="col"><span class="n">${b.count}</span><span class="stack" aria-hidden="true"><i class="fill dark" style="height:${(b.count / max) * 100}%"></i></span><span class="bl">${esc(lab(b))}</span></li>`).join("")}</ul>`;
}

// Heat colours are mixed in sRGB here so the text colour (white or black, whichever reads better) can be chosen from the real result.
const LO = [243, 246, 252], HI = [29, 74, 158];
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
function heatColours(t) {
  const c = LO.map((lo, i) => Math.round(lo + (HI[i] - lo) * t));
  const L = lum(c);
  return { bg: `rgb(${c.join(",")})`, fg: 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#fff" : "#000" };
}

function heat({ rows, cols, cells, max }) {
  const head = `<tr><td></td>${cols.map((c) => `<th scope="col">${esc(c.title)}</th>`).join("")}</tr>`;
  const body = rows.map((r, i) => `<tr><th scope="row">${esc(r.title)}</th>${cells[i].map((n) => {
    const { bg, fg } = heatColours(max ? n / max : 0);
    return `<td style="background:${bg};color:${fg}">${n}</td>`;
  }).join("")}</tr>`).join("");
  return `<div class="heat-wrap" role="region" aria-label="Table of counts, scrolls sideways on small screens" tabindex="0"><table class="heat"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

// ---------------------------------------------------------------- render
function render() {
  sourceBanner();
  const all = current();
  syncFilters(all);
  const plays = filterPlays(all, state.filters);
  const m = computeMetrics(plays);

  if (!plays.length) {
    out.innerHTML = `<p class="empty big">No plays match. ${all.length ? "Widen the filters above." : "Play a hand in the game and it will appear here, or use the sample-data preview to see what this page does."}</p>`;
    return;
  }

  const maxChal = Math.max(...m.challenges.map((c) => c.count), 1);
  const kpis = `<div class="kpis">
    ${kpi(m.totals.started, "plays started")}
    ${kpi(m.totals.completed, "plays finished", `${pct(m.totals.completionRate)} of those started`)}
    ${kpi(m.totals.players, m.totals.players === 1 ? "player" : "players", "anonymous ids")}
    ${kpi(`${m.combos.unique} of ${m.combos.possible}`, "hands explored", `${pct(m.combos.coverage, 1)} of every possible hand`)}
  </div>`;

  const funnel = card("Where players get to", `<ul class="rows">${m.funnel.map((f, i) => bar(f.step, f.count, m.funnel[0].count, { sub: `${f.count}`, note: i ? pct(f.count / (m.funnel[0].count || 1)) : "" })).join("")}</ul>`, { hint: "Every play that started." });

  const chal = card("Challenges chosen", `${legend(["light", "Chosen"], ["dark", "Played to the end"])}<ul class="rows">${m.challenges.map((c) => bar(c.title, c.count, maxChal, { over: c.completed, sub: `${c.count}`, note: `${c.completed} finished` })).join("")}</ul>`, { hint: "The Issue card each player picked." });

  const picks = DIMENSIONS.filter((d) => d.played && d.key !== "challenge").map((d) => {
    const list = m.cardPicks[d.key];
    const top = Math.max(...list.map((c) => c.count), 1);
    return `<div class="sub"><h3>${esc(d.label)}</h3><ul class="rows">${list.map((c) => bar(c.title, c.count, top, { sub: `${c.count}` })).join("")}</ul></div>`;
  }).join("");
  const cards = card("Which cards players choose", `<div class="subs">${picks}</div>`, { wide: true, hint: "Final choice in each finished play." });

  const topList = m.combos.top.slice(0, 10);
  const combos = card("Most repeated hands", topList.length
    ? `<ol class="top">${topList.map((c) => `<li><span class="n">${c.count}×</span><span class="hand">${c.labels.map((l) => `<b>${esc(l)}</b>`).join('<i aria-hidden="true"> · </i>')}</span></li>`).join("")}</ol>${m.combos.top[0].count === 1 ? `<p class="hint">No hand has been played twice yet.</p>` : ""}`
    : `<p class="empty">No finished plays yet.</p>`, { hint: "Challenge, force, value, method, place." });

  const axisOpts = DIMENSIONS.map((d) => ({ key: d.key, label: d.label }));
  const sel = (id, v) => `<select id="${id}">${axisOpts.map((o) => `<option value="${o.key}"${o.key === v ? " selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
  const ct = crossTab(plays, state.cross.row, state.cross.col);
  const cross = card("Compare any two things", `<div class="axes"><label>Rows ${sel("x-row", state.cross.row)}</label><label>Columns ${sel("x-col", state.cross.col)}</label></div>${heat(ct)}`, { wide: true, hint: `Finished plays for each pair, for example age by challenge (${ct.total} plays). Darker means more.` });

  const day_ = card("Plays per day", perDayChart(m.perDay));

  const t = m.time;
  const time = card("How long a play takes", `<p class="statline"><b>${fmtDur(t.median)}</b> median <span>· middle half between ${fmtDur(t.p25)} and ${fmtDur(t.p75)}</span></p>${timeChart(t)}<dl class="mini"><div><dt>Choosing a challenge</dt><dd>${fmtDur(t.steps.challenge)}</dd></div><div><dt>Filling the blanks</dt><dd>${fmtDur(t.steps.blanks)}</dd></div><div><dt>Answering questions</dt><dd>${fmtDur(t.steps.questions)}</dd></div></dl>`, { hint: "Finished plays only. Medians per step." });

  const e = m.engagement;
  const eng = card("How players engage", `<dl class="mini big"><div><dt>Cards swapped per play</dt><dd>${num1(e.avgSwaps)}</dd></div><div><dt>“Draw for me” per play</dt><dd>${num1(e.avgDraws)}</dd></div><div><dt>Questions answered</dt><dd>${pct(e.answeredRate)}</dd></div><div><dt>Wrote a prompt</dt><dd>${pct(e.promptRate)}</dd></div><div><dt>Average answer length</dt><dd>${e.avgAnswerChars == null ? "–" : `${Math.round(e.avgAnswerChars)} characters`}</dd></div></dl>`, { hint: "Finished plays only." });

  const whoBars = (rows) => { const top = Math.max(...rows.map((r) => r.count), 1); return `<ul class="rows">${rows.map((r) => bar(r.title, r.count, top, { over: r.completed, sub: `${r.count}`, note: `${r.completed} finished` })).join("")}</ul>`; };
  const who = card("Who is playing", `${legend(["light", "Started"], ["dark", "Finished"])}<div class="subs two"><div class="sub"><h3>Age</h3>${whoBars(m.who.age)}</div><div class="sub"><h3>Gender</h3>${whoBars(m.who.gender)}</div></div>`, { wide: true, hint: `${m.who.profiled} of ${m.totals.started} plays have these answers; ${m.who.named} gave a name and ${m.who.emails} an email address.` });

  const maxDev = Math.max(...m.devices.map((d) => d.count), 1);
  const dev = card("Devices", `<ul class="rows">${m.devices.map((d) => bar(d.device[0].toUpperCase() + d.device.slice(1), d.count, maxDev, { sub: `${d.count}` })).join("")}</ul>`);

  const finished = plays.filter((p) => p.status === "completed");
  const responses = card("What players wrote", finished.length
    ? `<ul class="resp">${finished.slice(-12).reverse().map((p) => {
        const hand = comboLabel([p.challenge, p.picks.forces, p.picks.value, p.picks.methods, p.picks.places].join("|")).join(" · ");
        const qa = (p.questions || []).filter((q) => (q.answer || "").trim());
        return `<li><details><summary><span class="hand">${esc(hand)}</span><span class="meta">${esc([p.player?.name, p.player?.email, AGE_BANDS.find((a) => a.id === p.player?.age)?.label, GENDERS.find((g) => g.id === p.player?.gender)?.label, p.group, when(p.completedAt || p.startedAt)].filter(Boolean).join(" · "))}</span></summary>${p.prompt.trim() ? `<p class="pr"><b>Prompt</b> ${esc(p.prompt)}</p>` : ""}${qa.length ? `<dl class="qa">${qa.map((q) => `<dt>${esc(q.text)}</dt><dd>${esc(q.answer)}</dd>`).join("")}</dl>` : `<p class="hint">No written answers.</p>`}</details></li>`;
      }).join("")}</ul><p class="hint">The latest 12 finished plays. The download has all of them.</p>`
    : `<p class="empty">No finished plays yet.</p>`, { wide: true, hint: "Free text from players. It may contain personal details; handle it as research data." });

  out.innerHTML = `${kpis}<div class="grid">${who}${funnel}${chal}${cards}${combos}${cross}${day_}${time}${eng}${dev}${responses}</div>`;
}

function syncFilters(all) {
  const ch = $("#f-challenge"), gr = $("#f-group");
  const fill = (el, items, cur) => {
    const html = el.firstElementChild.outerHTML + items.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`).join("");
    if (el.dataset.sig !== html) { el.innerHTML = html; el.dataset.sig = html; }
    el.value = cur;
  };
  const m = computeMetrics(all);
  fill(ch, m.challenges.map((c) => [c.id, c.title]), state.filters.challenge);
  fill(gr, m.totals.groups.map((g) => [g, g]), state.filters.group);
  fill($("#f-age"), AGE_BANDS.map((a) => [a.id, a.label]), state.filters.age);
  fill($("#f-gender"), GENDERS.map((g) => [g.id, g.label]), state.filters.gender);
  if (state.filters.group && !m.totals.groups.includes(state.filters.group)) state.filters.group = "";
}

// ---------------------------------------------------------------- events
$("#filters").addEventListener("change", (e) => {
  const f = e.target.form;
  state.filters = { days: +f.days.value, challenge: f.challenge.value, group: f.group.value, age: f.age.value, gender: f.gender.value };
  render();
});
$("#filters").addEventListener("submit", (e) => e.preventDefault());

out.addEventListener("change", (e) => {
  if (e.target.id === "x-row" || e.target.id === "x-col") {
    state.cross = { row: $("#x-row").value, col: $("#x-col").value };
    render();
    $(`#${e.target.id}`)?.focus();
  }
});

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
const exportRows = () => filterPlays(current(), state.filters);
$("#b-csv").addEventListener("click", () => download(`playcards-plays-${state.source}-${stamp()}.csv`, `﻿${toCSV(exportRows())}`, "text/csv;charset=utf-8"));
$("#b-json").addEventListener("click", () => download(`playcards-plays-${state.source}-${stamp()}.json`, JSON.stringify(exportRows(), null, 2), "application/json"));

const sampleBtn = $("#b-sample");
let before = "local";
sampleBtn.addEventListener("click", () => {
  const on = state.source !== "sample";
  if (on) before = state.source;
  state.source = on ? "sample" : before;
  sampleBtn.setAttribute("aria-pressed", String(on));
  sampleBtn.textContent = on ? "Back to real data" : "Preview with sample data";
  state.filters = { days: 0, challenge: "", group: "", age: "", gender: "" };
  $("#filters").reset();
  render();
});

async function showShared() {
  try {
    state.shared = await loadShared();
    state.source = "shared";
    before = "shared";
    state.note = "";
  } catch (err) {
    if (err instanceof Unauthorised) return signedOut();
    state.note = err.message;
  }
  render();
}

// ---------------------------------------------------------------- sign in
const gate = $("#gate"), app = $("#app"), outBtn = $("#b-out"), loginMsg = $("#loginmsg");

function signedOut(message = "") {
  app.hidden = true;
  outBtn.hidden = true;
  gate.hidden = false;
  out.innerHTML = "";
  loginMsg.textContent = message;
  $("#login").reset();
}

async function signedIn() {
  gate.hidden = true;
  app.hidden = false;
  outBtn.hidden = false;
  state.plays = loadLocal();
  state.source = "local";
  state.note = "";
  before = "local";
  sampleBtn.setAttribute("aria-pressed", "false");
  sampleBtn.textContent = "Preview with sample data";
  render();
  await showShared();
  $("#main").focus({ preventScroll: true });
}

$("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = $("#u").value.trim(), password = $("#pw").value;
  if (!user || !password) { loginMsg.textContent = "Enter both the user ID and the password."; (user ? $("#pw") : $("#u")).focus(); return; }
  const btn = $("#b-login");
  btn.disabled = true;
  loginMsg.textContent = "Signing in…";
  try {
    const { res, body } = await api("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user, password }) });
    if (res.ok) { $("#pw").value = ""; await signedIn(); return; }
    loginMsg.textContent = res.status === 401 ? (body?.error || "The user ID or password is not right.") : "The sign-in service is not available here. Open the deployed site, or run the project with `vercel dev`.";
    $("#pw").select();
  } catch {
    loginMsg.textContent = "Could not reach the sign-in service. Check the connection and try again.";
  } finally { btn.disabled = false; }
});

outBtn.addEventListener("click", async () => {
  await api("/api/session", { method: "DELETE" }).catch(() => {});
  state.shared = null;
  signedOut("You are signed out.");
  $("#u").focus();
});

// ---------------------------------------------------------------- start
(async function start() {
  try {
    const { res } = await api("/api/session");
    if (res.ok) return signedIn();
  } catch { /* fall through to the sign-in form */ }
  signedOut();
})();
