// Sends one email, by whichever provider is configured. Returns true only if the provider accepted the message.
//
//   Resend (needs a verified domain for real players):  RESEND_API_KEY, REPORT_FROM
//   Gmail (fine for testing; about 500 messages a day):  GMAIL_USER, GMAIL_APP_PASSWORD
//     The app password is a 16-character password made at https://myaccount.google.com/apppasswords
//     (it needs 2-Step Verification switched on). It is not the Gmail password.
// Resend wins if both are set.

export const mailConfigured = () =>
  Boolean((process.env.RESEND_API_KEY && process.env.REPORT_FROM) || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD));

export async function sendMail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (key && process.env.REPORT_FROM) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.REPORT_FROM, to: [to], subject, text, html }),
    });
    return r.ok;
  }

  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");   // Google shows it in groups of four
  if (user && pass) {
    const { default: nodemailer } = await import("nodemailer");
    const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    const info = await transport.sendMail({ from: `Pedagogy Playcards <${user}>`, to, subject, text, html });
    return info.accepted?.length > 0;
  }
  return false;
}
