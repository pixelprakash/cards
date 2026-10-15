// Builds the emailed report from a sanitised play. Nothing from the browser is put in the email except the player's own
// words, and those are escaped.

import { DECKS, titleOf } from "../src/cards-data.js";
import { SLOTS, SAY, SENTENCE, CHALLENGE_DECK } from "../src/game/config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const cardTitle = (deck, id) => { const c = DECKS[deck]?.cards.find((x) => x.id === id); return c ? titleOf(c) : ""; };

export function sentenceOf(play) {
  return SENTENCE.map((part) => (typeof part === "string" ? part : SAY[part.slot === "challenge" ? play.challenge : play.picks[part.slot]] ?? "…")).join("");
}

export function buildReport(play, siteUrl = "") {
  const cards = [["Challenge", cardTitle(CHALLENGE_DECK, play.challenge)], ...SLOTS.map((s) => [s.label, cardTitle(s.deck, play.picks[s.key])])];
  const answered = play.questions.filter((q) => q.answer.trim());
  const hello = play.player.name ? `Hello ${play.player.name},` : "Hello,";
  const sentence = sentenceOf(play);

  const text = [
    hello, "", "Here is your Pedagogy Playcards report.", "",
    sentence, "",
    "Your cards", ...cards.map(([k, v]) => `  ${k}: ${v}`), "",
    ...(play.prompt.trim() ? ["Your prompt", `  ${play.prompt.trim()}`, ""] : []),
    ...(answered.length ? ["Your answers", ...answered.flatMap((q) => ["", q.text, `  ${q.answer.trim()}`]), ""] : []),
    ...(siteUrl ? [`Play again: ${siteUrl}/play`] : []),
    "", "Pedagogy Playcards, by Prof. Deepak John Mathew and Salil Sahadevan, Department of Design.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f3f1ea;font-family:Georgia,serif;color:#100e0a">
<div style="max-width:560px;margin:0 auto;padding:28px 22px">
<p style="font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px">Pedagogy Playcards</p>
<h1 style="font:700 28px/1.15 Arial,sans-serif;margin:0 0 14px">Your report</h1>
<p style="font-size:17px;line-height:1.5;margin:0 0 18px">${esc(hello)}</p>
<p style="font-size:19px;line-height:1.5;margin:0 0 22px;padding:14px 16px;background:#fff;border-left:4px solid #100e0a">${esc(sentence)}</p>
<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 22px;background:#fff">${cards.map(([k, v]) => `<tr><td style="padding:9px 14px;border-bottom:1px solid #e4e0d4;font:700 13px Arial,sans-serif;width:110px">${esc(k)}</td><td style="padding:9px 14px;border-bottom:1px solid #e4e0d4;font-size:16px">${esc(v)}</td></tr>`).join("")}</table>
${play.prompt.trim() ? `<h2 style="font:700 17px Arial,sans-serif;margin:0 0 6px">Your prompt</h2><p style="font-size:16px;line-height:1.5;margin:0 0 22px;white-space:pre-wrap">${esc(play.prompt.trim())}</p>` : ""}
${answered.length ? `<h2 style="font:700 17px Arial,sans-serif;margin:0 0 8px">Your answers</h2>${answered.map((q) => `<p style="font:700 15px/1.4 Arial,sans-serif;margin:12px 0 2px">${esc(q.text)}</p><p style="font-size:16px;line-height:1.5;margin:0;white-space:pre-wrap">${esc(q.answer.trim())}</p>`).join("")}` : ""}
${siteUrl ? `<p style="margin:28px 0 0"><a href="${esc(siteUrl)}/play" style="display:inline-block;padding:12px 20px;background:#efe735;color:#100e0a;border:2px solid #100e0a;border-radius:999px;font:700 15px Arial,sans-serif;text-decoration:none">Play again</a></p>` : ""}
<p style="font:13px/1.5 Arial,sans-serif;color:#433e33;margin:28px 0 0">Pedagogy Playcards, by Prof. Deepak John Mathew and Salil Sahadevan, Department of Design.</p>
</div></body></html>`;

  return { subject: "Your Pedagogy Playcards report", text, html };
}
