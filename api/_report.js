// Builds the emailed report from a sanitised v2 play. Nothing from the browser is put in the email except the
// player's own words, and those are escaped.

import { DECKS, cardOf } from "../src/game/cards.js";
import { SLOTS, GROUPS } from "../src/game/config.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function buildReport(play, siteUrl = "") {
  const cards = SLOTS.flatMap((s) => (play.picks[s.key] || []).map((id) => [DECKS[s.deck].noun, cardOf(s.deck, id)?.name ?? ""])).filter(([, n]) => n);
  const qa = GROUPS.flatMap((g) => g.qs.map((q, i) => [q, play.answers?.[`${g.key}-${i + 1}`] ?? ""])).filter(([, a]) => a.trim());
  const nudges = (play.nudges || []).filter((n) => n.answer.trim());
  const hello = play.player.name ? `Hello ${play.player.name},` : "Hello,";
  const sc = play.scenario;
  const sentence = play.sentence || "";

  const text = [
    hello, "", "Here is the future you imagined with Pedagogy Playcards.", "",
    sc.title, "", sentence, "",
    `The idea: ${sc.idea}`, `The difference: ${sc.difference}`, "",
    "Your cards", ...cards.map(([k, v]) => `  ${k}: ${v}`), "",
    ...(play.details?.trim() ? ["Your own thoughts", `  ${play.details.trim()}`, ""] : []),
    ...(qa.length || nudges.length ? ["Your answers", ...qa.flatMap(([q, a]) => ["", q, `  ${a.trim()}`]), ...nudges.flatMap((n) => ["", n.text, `  ${n.answer.trim()}`]), ""] : []),
    "This describes an imagined future, not a prediction.",
    ...(siteUrl ? ["", `Play again: ${siteUrl}/play`] : []),
    "", "Pedagogy Playcards, by Prof. Deepak John Mathew and Salil Sahadevan, Department of Design.",
  ].join("\n");

  const h2 = (t) => `<h2 style="font:700 17px Arial,sans-serif;margin:0 0 8px">${esc(t)}</h2>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f1ea;font-family:Georgia,serif;color:#100e0a">
<div style="max-width:560px;margin:0 auto;padding:28px 22px">
<p style="font:700 13px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px">Pedagogy Playcards</p>
<h1 style="font:700 30px/1.15 Arial,sans-serif;margin:0 0 14px">${esc(sc.title)}</h1>
<p style="font-size:17px;line-height:1.5;margin:0 0 16px">${esc(hello)}</p>
<p style="font-size:18px;line-height:1.5;margin:0 0 22px;padding:14px 16px;background:#fff;border-left:4px solid #100e0a;font-style:italic">${esc(sentence)}</p>
<p style="font-size:17px;line-height:1.55;margin:0 0 10px"><b style="font-family:Arial,sans-serif">The idea.</b> ${esc(sc.idea)}</p>
<p style="font-size:17px;line-height:1.55;margin:0 0 22px"><b style="font-family:Arial,sans-serif">The difference.</b> ${esc(sc.difference)}</p>
${h2("Your cards")}
<table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 22px;background:#fff">${cards.map(([k, v]) => `<tr><td style="padding:9px 14px;border-bottom:1px solid #e4e0d4;font:700 13px Arial,sans-serif;width:170px">${esc(k)}</td><td style="padding:9px 14px;border-bottom:1px solid #e4e0d4;font-size:16px">${esc(v)}</td></tr>`).join("")}</table>
${play.details?.trim() ? `${h2("Your own thoughts")}<p style="font-size:16px;line-height:1.5;margin:0 0 22px;white-space:pre-wrap">${esc(play.details.trim())}</p>` : ""}
${qa.length || nudges.length ? `${h2("Your answers")}${[...qa, ...nudges.map((n) => [n.text, n.answer])].map(([q, a]) => `<p style="font:700 15px/1.4 Arial,sans-serif;margin:12px 0 2px">${esc(q)}</p><p style="font-size:16px;line-height:1.5;margin:0;white-space:pre-wrap">${esc(a.trim())}</p>`).join("")}` : ""}
<p style="font:13px/1.5 Arial,sans-serif;color:#433e33;margin:26px 0 0">This describes an imagined future, not a prediction.</p>
${siteUrl ? `<p style="margin:22px 0 0"><a href="${esc(siteUrl)}/play" style="display:inline-block;padding:12px 20px;background:#efe735;color:#100e0a;border:2px solid #100e0a;border-radius:999px;font:700 15px Arial,sans-serif;text-decoration:none">Play again</a></p>` : ""}
<p style="font:13px/1.5 Arial,sans-serif;color:#433e33;margin:26px 0 0">Pedagogy Playcards, by Prof. Deepak John Mathew and Salil Sahadevan, Department of Design.</p>
</div></body></html>`;

  return { subject: `Your imagined future: ${sc.title || "Pedagogy Playcards"}`.replace(/[<>\r\n]/g, " ").slice(0, 150), text, html };
}
