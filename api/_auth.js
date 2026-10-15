// Researcher sign-in, shared by api/session.js and api/plays.js (files starting with _ are not public routes).
//
// TEMPORARY credentials: the defaults below are for the first round of testing. Replace them without touching the
// code by setting RESEARCHER_USER and RESEARCHER_PASSWORD (and optionally SESSION_SECRET) in the Vercel project's
// environment variables. Anything in this repository should be treated as readable by whoever can see the repository.

import { createHmac, timingSafeEqual, createHash } from "node:crypto";

const USER = process.env.RESEARCHER_USER || "Salil";
const PASSWORD = process.env.RESEARCHER_PASSWORD || "design@123";
const SECRET = process.env.SESSION_SECRET || createHash("sha256").update(`pp-session:${USER}:${PASSWORD}`).digest("hex");

const COOKIE = "pp_session";
const TTL = 8 * 60 * 60;   // seconds

const same = (a, b) => {
  const x = createHash("sha256").update(String(a)).digest();
  const y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
};

export function checkCredentials(user, password) {
  // Both comparisons always run so timing does not reveal which field was wrong.
  const u = same(user, USER);
  const p = same(password, PASSWORD);
  return u && p;
}

const mac = (payload) => createHmac("sha256", SECRET).update(payload).digest("base64url");

export function sessionCookie(req) {
  const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  const payload = Buffer.from(JSON.stringify({ u: USER, exp: Math.floor(Date.now() / 1000) + TTL })).toString("base64url");
  return `${COOKIE}=${payload}.${mac(payload)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${TTL}${secure}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0`;

// Returns the signed-in user name, or null.
export function currentUser(req) {
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig || !same(sig, mac(payload))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return u === USER && exp > Date.now() / 1000 ? u : null;
  } catch { return null; }
}
