// Canvas renderers for the shareable hand poster and single-card export.
// Card geometry mirrors src/cards.css: everything scales from the card width (u = w / 100).

import { DECKS, titleOf, titleSize } from "./cards-data.js";

const DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, "Times New Roman", serif';

export async function loadFonts() {
  await Promise.all([
    document.fonts.load('600 40px "Fredoka"', "Aa"),
    document.fonts.load('400 20px "Josefin Sans"', "Aa"),
    document.fonts.load('400 40px "Anton"', "Aa"),
    document.fonts.load('400 40px "Yellowtail"', "Aa"),
    document.fonts.load('400 40px "Bangers"', "Aa"),
    document.fonts.load('800 40px "Bricolage Grotesque"', "Aa"),
    document.fonts.load('600 20px "Bricolage Grotesque"', "Aa"),
    document.fonts.load('italic 400 40px "Newsreader"', "Aa"),
  ]);
}

const images = new Map();
function loadImage(src) {
  if (!images.has(src)) {
    images.set(src, new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    }));
  }
  return images.get(src);
}

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Outlined, extruded display text (the printed logos).
function logoText(ctx, text, x, y, { font, fill, stroke, sw = 0, shadows = [], rot = 0, align = "center", spacing = 0 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.letterSpacing = `${spacing}px`;
  const paint = (dx, dy, f, s) => {
    if (s && sw) { ctx.strokeStyle = s; ctx.lineWidth = sw * 2; ctx.strokeText(text, dx, dy); }
    ctx.fillStyle = f;
    ctx.fillText(text, dx, dy);
  };
  for (const [dx, dy, col] of shadows) paint(dx, dy, col, col);
  paint(0, 0, fill, stroke);
  ctx.restore();
}

function drawSpinner(ctx, cx, cy, size) {
  const s = size / 100;
  for (let p = 0; p < 12; p++) {
    const a = 0.12 + (0.88 * ((p + 11) % 12)) / 11;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((p * 30 * Math.PI) / 180);
    ctx.fillStyle = `rgba(47,45,51,${a.toFixed(2)})`;
    rr(ctx, -4 * s, -46 * s, 8 * s, 24 * s, 4 * s);
    ctx.fill();
    ctx.restore();
  }
}

// Draws one card face. `u` is 1% of the card width. Returns nothing; art images must already be loaded.
async function drawFace(ctx, x, y, w, deckKey, card, rot = 0) {
  const d = DECKS[deckKey];
  const u = w / 100;
  const h = (w * 110) / 63;
  const places = deckKey === "places";
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  // border + shadow
  ctx.shadowColor = "rgba(16,14,10,.38)";
  ctx.shadowBlur = 5 * u;
  ctx.shadowOffsetY = 3 * u;
  ctx.fillStyle = d.border;
  rr(ctx, 0, 0, w, h, 8 * u);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // panel
  const pt = h * 0.031;
  const pl = (places ? 7.6 : 5.4) * u;
  const pr = 5.4 * u;
  const pw = w - pl - pr;
  const ph = h - pt * 2;
  ctx.fillStyle = "#fbfcff";
  rr(ctx, pl, pt, pw, ph, 5.4 * u);
  ctx.fill();

  if (places) {
    const sx = 0.8 * u, sw = 4.1 * u, top = pt, hh = ph;
    const bands = (x0, parts) => parts.forEach(([a, b, col]) => { ctx.fillStyle = col; ctx.fillRect(x0, top + hh * a, sw, hh * (b - a)); });
    bands(sx, [[0, 0.24, "#c8393a"], [0.24, 0.52, "#e8943c"], [0.52, 1, "#f2d349"]]);
    bands(sx + sw, [[0, 0.49, "#3b7fd8"], [0.49, 1, "#52a89d"]]);
  }

  ctx.save();
  rr(ctx, pl, pt, pw, ph, 5.4 * u);
  ctx.clip();

  const cx = pl + pw / 2;
  const side = places ? 0 : 6 * u;
  const innerW = pw - side * 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // title
  const ts = titleSize(deckKey, card.lines) * u;
  const tlh = ts * 1.04;
  let y0 = pt + 8 * u;
  ctx.font = `600 ${ts}px "Fredoka", sans-serif`;
  ctx.letterSpacing = `${0.005 * ts}px`;
  ctx.fillStyle = d.titleColor;
  card.lines.forEach((ln, i) => ctx.fillText(places ? ln : ln.toUpperCase(), cx, y0 + tlh * (i + 0.5)));
  ctx.letterSpacing = "0px";
  const titleBottom = y0 + tlh * card.lines.length;

  // bottom stack (logo, sticker, description), measured from the bottom up
  let bottom = pt + ph - 5.2 * u;
  let logoTop = bottom;
  const forces = deckKey === "forces";
  if (deckKey === "value") {
    const fs = 7.4 * u; logoTop = bottom - fs;
    logoText(ctx, "VALUE CARDS", cx, logoTop + fs / 2, { font: `400 ${fs}px "Anton", Impact, sans-serif`, fill: "#f7e48c", stroke: "#c9344a", sw: 0.55 * u, shadows: [[0.7 * u, 0.7 * u, "#c9344a"], [1.1 * u, 1.1 * u, "#c9344a"]], rot: -1.5, spacing: 0.02 * fs });
  } else if (deckKey === "methods") {
    const fs = 8.4 * u; logoTop = bottom - fs;
    logoText(ctx, "Methods of Learning", cx, logoTop + fs / 2, { font: `400 ${fs}px "Anton", Impact, sans-serif`, fill: "#c8262e", stroke: "#4a0d10", sw: 0.4 * u, shadows: [[0.5 * u, 0.7 * u, "#111"], [0.9 * u, 1.1 * u, "#111"]], spacing: 0.01 * fs });
  } else if (forces) {
    const fs = 5.8 * u; logoTop = bottom - fs;
    logoText(ctx, "12 FORCES OF CHANGE", cx, logoTop + fs / 2, { font: `400 ${fs}px "Anton", Impact, sans-serif`, fill: "#f6c619", stroke: "#5a3b00", sw: 0.4 * u, shadows: [[0.4 * u, 0.5 * u, "#3a2a05"]], spacing: 0.02 * fs });
    const sfs = 6.4 * u; const swTop = logoTop - 4 * u - sfs;
    logoText(ctx, "SO WHAT?", cx, swTop + sfs / 2, { font: `400 ${sfs}px "Bangers", cursive`, fill: "#6f52c9", stroke: "#ffffff", sw: 0.9 * u, shadows: [[0.3 * u, 0.4 * u, "rgba(60,40,140,.35)"]], rot: -3, spacing: 0.04 * sfs });
    logoTop = swTop;
  } else if (deckKey === "issue") {
    const fs = 10.5 * u; logoTop = bottom - fs;
    logoText(ctx, "Issue card", pl + side + 1 * u, logoTop + fs / 2, { font: `400 ${fs}px "Yellowtail", cursive`, fill: "#e8993a", stroke: "#ffffff", sw: 0.5 * u, shadows: [[0.9 * u, 1 * u, "#8c5a3a"], [0.5 * u, 0.6 * u, "#ffffff"]], rot: -4, align: "left" });
  }

  let descTop = logoTop;
  if (card.desc && !places) {
    const ds = (d.descSize || 5.6) * u;
    const dlh = ds * (forces ? 1.22 : 1.28);
    ctx.font = `400 ${ds}px "Josefin Sans", sans-serif`;
    const lines = wrap(ctx, card.desc, innerW);
    const gap = (deckKey === "value" ? 5.5 : forces ? 3.6 : 4.5) * u;
    const dBottom = logoTop - gap;
    descTop = dBottom - dlh * lines.length;
    ctx.fillStyle = d.descColor;
    lines.forEach((ln, i) => ctx.fillText(ln, cx, descTop + dlh * (i + 0.5)));
  }

  // art
  const a = card.art;
  const aTop = titleBottom + 4 * u;
  const aBottom = places ? pt + ph : descTop - 3 * u;
  const aH = Math.max(0, aBottom - aTop);
  if (a.type === "spinner") {
    drawSpinner(ctx, cx, aTop + aH / 2, Math.min(40 * u, aH));
  } else if (a.type === "sun") {
    const sw2 = innerW, sh = Math.min(sw2 * 0.475, aH);
    const g = ctx.createLinearGradient(0, aBottom - sh, 0, aBottom);
    g.addColorStop(0, "#efa563"); g.addColorStop(0.45, "#f4bd8a"); g.addColorStop(0.85, "#fbe9d8"); g.addColorStop(1, "#fbfcff");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, aBottom, sw2 / 2, sh, 0, Math.PI, 2 * Math.PI); ctx.fill();
  } else if (a.type === "star" || a.type === "pin") {
    ctx.fillStyle = d.titleColor;
    const s = 34 * u, cy = aTop + aH / 2 - (places ? 7 * u : 0);
    ctx.save(); ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 24, s / 24);
    if (a.type === "star") ctx.fill(new Path2D("M12 2c.8 5.6 4.4 9.2 10 10-5.6.8-9.2 4.4-10 10-.8-5.6-4.4-9.2-10-10 5.6-.8 9.2-4.4 10-10z"));
    else { ctx.strokeStyle = d.titleColor; ctx.lineWidth = 1.6; ctx.lineJoin = "round"; ctx.stroke(new Path2D("M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z")); ctx.beginPath(); ctx.arc(12, 9.5, 2.4, 0, 7); ctx.stroke(); }
    ctx.restore();
  } else if (a.src) {
    const img = await loadImage(a.src);
    ctx.globalCompositeOperation = "multiply";
    if (places) {
      // cover the area, anchored bottom-centre
      const s = Math.max(pw / img.width, aH / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, pl + (pw - dw) / 2, aBottom - dh, dw, dh);
    } else {
      const s = Math.min(innerW / img.width, aH / img.height);
      const dw = img.width * s, dh = img.height * s;
      ctx.drawImage(img, cx - dw / 2, aTop + (aH - dh) / 2, dw, dh);
    }
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore(); // clip

  if (card.mine) {
    ctx.font = `600 ${3.6 * u}px "Josefin Sans", sans-serif`;
    ctx.letterSpacing = `${0.04 * 3.6 * u}px`;
    const label = "YOUR CARD";
    const tw = ctx.measureText(label).width + 4.8 * u;
    ctx.fillStyle = "#16130a";
    rr(ctx, w - pr - 1 * u - tw, pt + 4 * u, tw, 6 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(label, w - pr - 1 * u - tw / 2, pt + 7 * u);
    ctx.letterSpacing = "0px";
  }
  ctx.restore();
}

export async function makeCardPng(deck, card) {
  await loadFonts();
  const cv = document.createElement("canvas");
  cv.width = 1000;
  cv.height = 1600;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  await drawFace(ctx, 100, 100, 800, deck, card, 0);
  return toBlob(cv);
}

// hand: [{ deck, card }] in order; prompt: string (may be empty)
export async function makePoster(hand, prompt, handNo) {
  await loadFonts();
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  // header
  ctx.save();
  ctx.translate(72, 52);
  ctx.scale(1.4, 1.4);
  ctx.fillStyle = "#100e0a";
  ctx.fill(new Path2D("M12 0c.9 6.2 5.8 11.1 12 12-6.2.9-11.1 5.8-12 12-.9-6.2-5.8-11.1-12-12C6.2 11.1 11.1 6.2 12 0z"));
  ctx.restore();
  ctx.fillStyle = "#100e0a";
  ctx.font = `700 24px ${DISPLAY}`;
  ctx.letterSpacing = "3px";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("PEDAGOGY PLAYCARDS", 124, 78);
  ctx.textAlign = "right";
  ctx.fillText(`HAND ${handNo}`, W - 72, 78);
  ctx.letterSpacing = "0px";

  // table: three cards, then two
  ctx.fillStyle = "#25221f";
  ctx.beginPath();
  ctx.ellipse(740, 560, 330, 400, 0, 0, Math.PI * 2);
  ctx.fill();
  const cw = 252, gap = 30, ch = (cw * 110) / 63;
  const row1x = (W - (cw * 3 + gap * 2)) / 2;
  const row2x = (W - (cw * 2 + gap)) / 2;
  const y1 = 130, y2 = y1 + ch + 22;
  const rots = [-1.6, 1.2, -0.8, 1.6, -1.2];
  const pos = [
    [row1x, y1 + 6], [row1x + cw + gap, y1 - 8], [row1x + (cw + gap) * 2, y1 + 8],
    [row2x, y2 - 2], [row2x + cw + gap, y2 + 6],
  ];
  for (let i = 0; i < hand.length; i++) await drawFace(ctx, pos[i][0], pos[i][1], cw, hand[i].deck, hand[i].card, rots[i]);

  // prompt, or the hand's card names if no prompt was written
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const ty = y2 + ch + 92;
  ctx.fillStyle = "#5a5448";
  ctx.font = `700 20px ${DISPLAY}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(prompt ? "PROMPT" : "THIS HAND", 84, ty - 40);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#100e0a";
  const text = prompt || hand.map((h) => titleOf(h.card)).join("  ·  ");
  let fs = prompt ? 42 : 30;
  ctx.font = `italic 400 ${fs}px ${SERIF}`;
  let lines = wrap(ctx, text, W - 168);
  while (lines.length > 4 && fs > 26) { fs -= 2; ctx.font = `italic 400 ${fs}px ${SERIF}`; lines = wrap(ctx, text, W - 168); }
  lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, 84, ty + i * fs * 1.35));

  ctx.fillStyle = "#5a5448";
  ctx.font = `600 22px ${DISPLAY}`;
  ctx.letterSpacing = "2px";
  ctx.fillText("HOW COULD WE REIMAGINE EDUCATION RADICALLY?", 84, H - 56);
  ctx.letterSpacing = "0px";
  return toBlob(cv);
}

function toBlob(cv) {
  return new Promise((res) => cv.toBlob(res, "image/png"));
}
