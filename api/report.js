// POST /api/report  { play, email, consent: true }
// Emails a player their report and, because they agreed, keeps their address on their play for the research team.
//
// Email goes out through Gmail (testing) or Resend (a verified domain); see api/_mail.js for the environment variables.
// With neither set the player's address is still kept (if the database is connected) but nothing is sent, and the
// response says so, so the screen never claims a report went out when it did not.

import { sanitise, cleanEmail, redis, hasDb, HASH } from "./_play.js";
import { buildReport } from "./_report.js";
import { sendMail, mailConfigured } from "./_mail.js";

const json = (res, status, body) => {
  res.setHeader("cache-control", "no-store");
  res.status(status).json(body);
};

const MAX_SENDS_PER_PLAY = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("allow", "POST"); return json(res, 405, { error: "Method not allowed." }); }

  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
    if (!body || JSON.stringify(body).length > 24_000) return json(res, 400, { error: "Invalid request." });

    const email = cleanEmail(body.email);
    if (!email) return json(res, 400, { error: "That email address does not look right." });
    if (body.consent !== true) return json(res, 400, { error: "Please tick the box to agree." });

    const play = sanitise(body.play);
    if (!play || play.v !== 2 || play.status !== "completed") return json(res, 400, { error: "Finish the game first." });
    play.player.email = email;

    // keep the address, and count sends so one play cannot be used to mail someone over and over
    let stored = false, sends = 0;
    if (hasDb()) {
      const prev = JSON.parse((await redis("HGET", HASH, play.id)) || "null");
      sends = prev?.reportSends || 0;
      if (sends >= MAX_SENDS_PER_PLAY) return json(res, 429, { error: "This report has already been sent." });
    }

    let sent = false;
    if (mailConfigured()) {
      const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
      const site = req.headers.host ? `${proto}://${req.headers.host}` : "";
      sent = await sendMail({ to: email, ...buildReport(play, site) }).catch(() => false);
    }

    if (hasDb()) {
      await redis("HSET", HASH, play.id, JSON.stringify({ ...play, reportSends: sends + (sent ? 1 : 0) }));
      stored = true;
    }

    return json(res, 200, { sent, stored });
  } catch {
    return json(res, 500, { error: "Something went wrong." });
  }
}
