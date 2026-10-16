// Canvas renderer for the saved scenario image (the finish screen's "Save my scenario").
// Draws the title, the sentence, the idea, the difference and the cards that built it.

const DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const SERIF = '"Newsreader", Georgia, "Times New Roman", serif';

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
  for (const word of String(text).split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxW) { lines.push(line); line = word; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function toBlob(cv) {
  return new Promise((res) => cv.toBlob(res, "image/png"));
}

// The scenario poster (the October flow): title, the sentence, the idea, the difference, and the cards that built it.
export async function makeScenarioPoster(play, cards) {
  await Promise.all([
    document.fonts.load('800 40px "Bricolage Grotesque"', "Aa"),
    document.fonts.load('600 20px "Bricolage Grotesque"', "Aa"),
    document.fonts.load('400 30px "Newsreader"', "Aa"),
    document.fonts.load('italic 400 30px "Newsreader"', "Aa"),
  ]).catch(() => {});
  const W = 1080, pad = 84;
  const cw = 196, ch = Math.round(cw * 1050 / 600), gap = 22;
  const rows = Math.ceil(cards.length / 4);
  const textW = W - pad * 2;

  const probe = document.createElement("canvas").getContext("2d");
  const lines = (font, text, w) => { probe.font = font; return wrap(probe, text, w); };
  const titleFont = `800 76px ${DISPLAY}`, bodyFont = `400 34px ${SERIF}`, sentFont = `italic 400 32px ${SERIF}`;
  const titleLines = lines(titleFont, play.scenario.title || "My future of learning", textW);
  const sentLines = lines(sentFont, play.sentence || "", textW);
  const ideaLines = lines(bodyFont, play.scenario.idea || "", textW);
  const diffLines = lines(bodyFont, play.scenario.difference || "", textW);
  const H = 150 + titleLines.length * 84 + 40 + sentLines.length * 46 + 60 + (ideaLines.length + diffLines.length) * 48 + 150 + rows * (ch + gap) + 120;

  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#f3f1ea"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#100e0a"; ctx.fillRect(0, 0, W, 16);
  ctx.textBaseline = "alphabetic";

  let y = 110;
  ctx.fillStyle = "#5a5448"; ctx.font = `700 20px ${DISPLAY}`; ctx.letterSpacing = "3px";
  ctx.fillText("PEDAGOGY PLAYCARDS", pad, y - 30); ctx.letterSpacing = "0px";
  ctx.fillStyle = "#100e0a"; ctx.font = titleFont;
  titleLines.forEach((ln, i) => ctx.fillText(ln, pad, y + 56 + i * 84));
  y += titleLines.length * 84 + 40;

  ctx.fillStyle = "#433e33"; ctx.font = sentFont;
  sentLines.forEach((ln, i) => ctx.fillText(ln, pad, y + 20 + i * 46));
  y += sentLines.length * 46 + 60;

  const block = (label, ls) => {
    ctx.fillStyle = "#5a5448"; ctx.font = `700 20px ${DISPLAY}`; ctx.letterSpacing = "3px";
    ctx.fillText(label, pad, y); ctx.letterSpacing = "0px";
    ctx.fillStyle = "#100e0a"; ctx.font = bodyFont;
    ls.forEach((ln, i) => ctx.fillText(ln, pad, y + 44 + i * 48));
    y += 44 + ls.length * 48 + 30;
  };
  block("THE IDEA", ideaLines);
  block("THE DIFFERENCE", diffLines);

  y += 20;
  const imgs = await Promise.all(cards.map((c) => loadImage(c.img)));
  
  imgs.forEach((img, i) => {
    const x = pad + (i % 4) * (cw + gap), yy = y + Math.floor(i / 4) * (ch + gap);
    ctx.save(); ctx.shadowColor = "rgba(16,14,10,.35)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
    rr(ctx, x, yy, cw, ch, 12); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, x, yy, cw, ch, 12); ctx.clip(); ctx.drawImage(img, x, yy, cw, ch); ctx.restore();
  });


  ctx.fillStyle = "#5a5448"; ctx.font = `600 22px ${DISPLAY}`; ctx.letterSpacing = "2px";
  ctx.fillText("AN IMAGINED FUTURE, NOT A PREDICTION", pad, H - 56); ctx.letterSpacing = "0px";
  return toBlob(cv);
}
