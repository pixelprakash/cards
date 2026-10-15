// Researcher sign-in.
//   GET    /api/session   who is signed in      -> 200 { user } or 401
//   POST   /api/session   { user, password }    -> 200 and a signed, HttpOnly cookie, or 401
//   DELETE /api/session   sign out
import { checkCredentials, sessionCookie, clearCookie, currentUser, signInEnabled } from "./_auth.js";

const json = (res, status, body) => {
  res.setHeader("cache-control", "no-store");
  res.status(status).json(body);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method === "GET") {
    const user = currentUser(req);
    return user ? json(res, 200, { user }) : json(res, 401, { error: "Not signed in." });
  }

  if (req.method === "POST") {
    if (!signInEnabled()) return json(res, 503, { error: "Sign-in is not set up yet. Set RESEARCHER_PASSWORD (at least 8 characters) in the project settings." });
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const { user = "", password = "" } = body || {};
    if (typeof user !== "string" || typeof password !== "string" || user.length > 100 || password.length > 200) return json(res, 400, { error: "Invalid request." });
    if (!checkCredentials(user.trim(), password)) {
      await wait(700);   // slows down guessing
      return json(res, 401, { error: "The user ID or password is not right." });
    }
    res.setHeader("set-cookie", sessionCookie(req));
    return json(res, 200, { user: user.trim() });
  }

  if (req.method === "DELETE") {
    res.setHeader("set-cookie", clearCookie());
    return json(res, 200, { ok: true });
  }

  res.setHeader("allow", "GET, POST, DELETE");
  return json(res, 405, { error: "Method not allowed." });
}
