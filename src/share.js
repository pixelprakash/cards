// Canvas renderers for the shareable scenario poster and single-card export.
// Card geometry mirrors the CSS .card (everything scales from the card width: u = w / 100).

const DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, "Times New Roman", serif';

const DECK = {
  action: { c: "#efe735", ci: "#14120a", label: "Action Word", code: "A" },
  value: { c: "#8ad6fe", ci: "#1b4f9c", label: "Value Card", code: "V", glyph: "M12 21c0-6 2-10 8-13-1 6-3 10-8 13zM12 21c0-6-3-10-8-11 1 6 4 9 8 11z" },
  mode: { c: "#725689", ci: "#ffffff", label: "Mode & Methods Card", code: "M", glyph: "M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7M17.5 3v4h-4M6.5 21v-4h4" },
  place: { c: "#8a4641", ci: "#f3d77a", label: "Places & Spaces Card", code: "P&S", glyph: "M3 21h18M5 21V10l7-5 7 5v11M9.5 21v-6h5v6" },
};
const STAR = "M12 0c.9 6.2 5.8 11.1 12 12-6.2.9-11.1 5.8-12 12-.9-6.2-5.8-11.1-12-12C6.2 11.1 11.1 6.2 12 0z";

export async function loadFonts() {
  await Promise.all([
    document.fonts.load(`800 40px "Bricolage Grotesque"`),
    document.fonts.load(`600 20px "Bricolage Grotesque"`),
    document.fonts.load(`400 20px "Newsreader"`),
    document.fonts.load(`italic 400 40px "Newsreader"`),
  ]);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

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

function spaced(ctx, em, size) {
  ctx.letterSpacing = `${em * size}px`;
}

export function drawCard(ctx, x, y, w, deck, card, rot = 0) {
  const d = DECK[deck];
  const u = w / 100;
  const h = (w * 13) / 9;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  // white card stock with shadow
  ctx.shadowColor = "rgba(16,14,10,.35)";
  ctx.shadowBlur = 5 * u;
  ctx.shadowOffsetY = 3 * u;
  ctx.fillStyle = "#fff";
  roundRect(ctx, 0, 0, w, h, 8 * u);
  ctx.fill();
  ctx.shadowColor = "transparent";

  // coloured panel
  const rim = 3.2 * u;
  ctx.fillStyle = d.c;
  roundRect(ctx, rim, rim, w - rim * 2, h - rim * 2, 6.3 * u);
  ctx.fill();

  const pad = rim + 8 * u;
  ctx.fillStyle = d.ci;
  ctx.textBaseline = "alphabetic";

  // label, top left
  ctx.globalAlpha = 0.85;
  ctx.font = `600 ${5.2 * u}px ${DISPLAY}`;
  spaced(ctx, 0.05, 5.2 * u);
  ctx.textAlign = "left";
  const tag = card.real ? "" : card.mine ? " \u2726" : " \u00b7 SAMPLE";
  wrap(ctx, d.label.toUpperCase() + tag, 42 * u).forEach((ln, i) => ctx.fillText(ln, pad, pad + 5.2 * u * (1 + i * 1.25)));
  ctx.globalAlpha = 1;

  // title block, centred
  const isAction = deck === "action";
  const tSize = isAction ? 16 * u : deck === "value" ? 9.6 * u : 9 * u;
  ctx.font = `800 ${tSize}px ${DISPLAY}`;
  spaced(ctx, deck === "value" ? 0.01 : isAction ? 0 : 0.02, tSize);
  const title = isAction ? card.t : card.t.toUpperCase();
  const tLines = wrap(ctx, title, 74 * u);
  const tLH = tSize * 1.04;

  let dLines = [];
  const dSize = 5.1 * u;
  if (card.d) {
    ctx.font = `400 ${dSize}px ${SERIF}`;
    spaced(ctx, 0, dSize);
    dLines = wrap(ctx, card.d, 68 * u);
  }
  const dLH = dSize * 1.32;
  const gSize = d.glyph ? 14 * u : 0;
  const gap = 3.6 * u;
  const blockH = (gSize ? gSize + gap : 0) + tLines.length * tLH + (dLines.length ? gap + dLines.length * dLH : 0);
  let cy = h / 2 - blockH / 2 + 2 * u;

  ctx.textAlign = "center";
  if (gSize) {
    ctx.save();
    ctx.translate(w / 2 - gSize / 2, cy);
    ctx.scale(gSize / 24, gSize / 24);
    ctx.strokeStyle = d.ci;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(d.glyph));
    ctx.restore();
    cy += gSize + gap;
  }
  ctx.font = `800 ${tSize}px ${DISPLAY}`;
  spaced(ctx, deck === "value" ? 0.01 : isAction ? 0 : 0.02, tSize);
  tLines.forEach((ln, i) => ctx.fillText(ln, w / 2, cy + tSize * 0.86 + i * tLH));
  cy += tLines.length * tLH + gap;
  if (dLines.length) {
    ctx.globalAlpha = 0.92;
    ctx.font = `400 ${dSize}px ${SERIF}`;
    spaced(ctx, 0, dSize);
    dLines.forEach((ln, i) => ctx.fillText(ln, w / 2, cy + dSize + i * dLH));
    ctx.globalAlpha = 1;
  }

  // deck code, bottom right
  ctx.font = `500 ${8.5 * u}px ${DISPLAY}`;
  spaced(ctx, 0, 8.5 * u);
  ctx.textAlign = "right";
  ctx.fillText(d.code, w - pad, h - pad);
  ctx.restore();
  ctx.letterSpacing = "0px";
}

export async function makeCardPng(deck, card) {
  await loadFonts();
  const cv = document.createElement("canvas");
  cv.width = 1000;
  cv.height = 1360;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cv.width, cv.height);
  drawCard(ctx, 100, 100, 800, deck, card, 0);
  return toBlob(cv);
}

// parts: [{ t: string, deck?: key }] in reading order; hand: { action, place, value, mode } -> card
export async function makePoster(parts, hand, handNo) {
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
  ctx.fill(new Path2D(STAR));
  ctx.restore();
  ctx.fillStyle = "#100e0a";
  ctx.font = `700 24px ${DISPLAY}`;
  ctx.letterSpacing = "3px";
  ctx.textAlign = "left";
  ctx.fillText("PEDAGOGY PLAYCARDS", 124, 78);
  ctx.textAlign = "right";
  ctx.fillText(`HAND ${handNo}`, W - 72, 78);
  ctx.letterSpacing = "0px";

  // table
  ctx.fillStyle = "#25221f";
  ctx.beginPath();
  ctx.ellipse(700, 540, 340, 380, 0, 0, Math.PI * 2);
  ctx.fill();
  const cw = 260, gx = 36, gy = 26;
  const x0 = (W - (cw * 2 + gx)) / 2;
  const ch = (cw * 13) / 9;
  const y0 = 135;
  drawCard(ctx, x0, y0 + 6, cw, "action", hand.action, -2);
  drawCard(ctx, x0 + cw + gx, y0 - 14, cw, "place", hand.place, 1.5);
  drawCard(ctx, x0, y0 + ch + gy + 20, cw, "value", hand.value, -1);
  drawCard(ctx, x0 + cw + gx, y0 + ch + gy - 4, cw, "mode", hand.mode, 2.5);

  // sentence with deck-coloured marker underlines
  const words = [];
  let pending = false;
  for (const p of parts) {
    for (const m of p.t.matchAll(/\S+|\s+/g)) {
      if (/^\s/.test(m[0])) { pending = true; continue; }
      words.push({ w: m[0], deck: p.deck, space: pending });
      pending = false;
    }
  }
  const fs = 46, lh = 64, maxW = W - 168;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0px";
  ctx.font = `italic 400 ${fs}px ${SERIF}`;
  const space = ctx.measureText(" ").width;
  const lines = [[]];
  let lw = 0;
  for (const wd of words) {
    const ww = ctx.measureText(wd.w).width;
    const add = (lines.at(-1).length && wd.space ? space : 0) + ww;
    if (lines.at(-1).length && lw + add > maxW) { lines.push([]); lw = 0; }
    wd.x = lw + (lines.at(-1).length && wd.space ? space : 0);
    wd.ww = ww;
    lw = wd.x + ww;
    lines.at(-1).push(wd);
  }
  let y = y0 + ch * 2 + gy + 120;
  lines.forEach((line) => {
    line.forEach((wd, i) => {
      if (!wd.deck) return;
      const next = line[i + 1];
      const ext = next && next.deck === wd.deck ? space : 0;
      ctx.fillStyle = DECK[wd.deck].c;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(84 + wd.x - 2, y + 8, wd.ww + ext + 4, 14);
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = "#100e0a";
    line.forEach((wd) => ctx.fillText(wd.w, 84 + wd.x, y));
    y += lh;
  });

  // footer
  ctx.fillStyle = "#5a5448";
  ctx.font = `600 22px ${DISPLAY}`;
  ctx.letterSpacing = "2px";
  ctx.textAlign = "left";
  ctx.fillText("HOW COULD WE REIMAGINE EDUCATION RADICALLY?", 84, H - 64);
  ctx.letterSpacing = "0px";
  return toBlob(cv);
}

function toBlob(cv) {
  return new Promise((res) => cv.toBlob(res, "image/png"));
}
