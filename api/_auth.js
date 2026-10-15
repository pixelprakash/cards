// Researcher sign-in, shared by api/session.js and api/plays.js (files starting with _ are not public routes).
//
// The researcher password is never kept in this repository. Set these in the Vercel project's environment variables:
//   RESEARCHER_PASSWORD   required. Without it nobody can sign in.
//   RESEARCHER_USER       optional, defaults to "Salil"
//   SESSION_SECRET        recommended: a long random string used to sign the session cookie

import { createHmac, timingSafeEqual, createHash } from "node:crypto";

const USER = process.env.RESEARCHER_USER || "Salil";
const PASSWORD = process.env.RESEARCHER_PASSWORD || "";
const SECRET = process.env.SESSION_SECRET || createHash("sha256").update(`pp-session:${USER}:${PASSWORD}`).digest("hex");

export const signInEnabled = () => PASSWORD.length >= 8;

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
  return signInEnabled() && u && p;
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
  if (!signInEnabled()) return null;   // no password configured: no session is ever valid
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig || !same(sig, mac(payload))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return u === USER && exp > Date.now() / 1000 ? u : null;
  } catch { return null; }
}
