// Shared store for game plays (Vercel serverless function, Node runtime).
//
//   POST /api/plays   a player's browser saves or updates one play (no login; the record is sanitised here)
//   GET  /api/plays   the researcher view reads every play; needs the signed-in researcher cookie (see api/session.js)
//
// Storage is Upstash Redis (Vercel Marketplace "Upstash for Redis"), reached over its REST API, so there is no
// dependency to install. Environment variables:
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN   (or KV_REST_API_URL, KV_REST_API_TOKEN)
// Without them the function answers 503 and the site keeps working with each browser's own local copy.

import { currentUser } from "./_auth.js";
import { sanitise, redis, hasDb, HASH } from "./_play.js";

const MAX_BODY = 24_000;

const json = (res, status, body) => {
  res.setHeader("cache-control", "no-store");
  res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method === "GET" && !currentUser(req)) return json(res, 401, { error: "Sign in first." });
  if (!hasDb()) return json(res, 503, { error: "The shared database is not connected." });

  try {
    if (req.method === "POST") {
      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      if (raw.length > MAX_BODY) return json(res, 413, { error: "Too large." });
      const play = sanitise(typeof req.body === "string" ? JSON.parse(raw) : req.body);
      if (!play) return json(res, 400, { error: "Not a valid play." });
      await redis("HSET", HASH, play.id, JSON.stringify(play));
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET") {
      if (!currentUser(req)) return json(res, 401, { error: "Sign in first." });
      const rows = (await redis("HVALS", HASH)) || [];
      const plays = rows.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
      plays.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      return json(res, 200, { plays });
    }

    res.setHeader("allow", "GET, POST");
    return json(res, 405, { error: "Method not allowed." });
  } catch {
    return json(res, 500, { error: "Something went wrong." });
  }
}
