# Pedagogy Playcards

Product site for Pedagogy Playcards, a card-based speculative design toolkit for reimagining the future of learning.
Plain HTML, CSS and JavaScript on Vite. No framework.

```bash
npm install
npm run dev        # local dev server
npm run build      # production build into dist/
npm run preview    # serve dist/ locally
npm run lint
```

## Pages

| Address | What it is |
| --- | --- |
| `/` | The story and the decks. "Play" buttons lead to the game. |
| `/play` | The game console: choose a challenge (an Issue card), fill four blanks with cards, answer the generated questions. |
| `/researcher` | Sign-in, then the dashboard: hands explored out of 432, challenge and card choices, pairings, timings, answers, CSV/JSON export. Not indexed. |

The game's rules live in `src/game/config.js` and `src/game/questions.js`. The metrics are pure functions in `src/researcher/metrics.js`.

## Researcher sign-in and shared data

`api/session.js` checks the user ID and password on the server and sets a signed, HttpOnly cookie; `api/plays.js` only
returns plays to a signed-in researcher. The password is never kept in the repository: set `RESEARCHER_PASSWORD`
(at least 8 characters, required: without it nobody can sign in), `SESSION_SECRET` (a long random string) and optionally
`RESEARCHER_USER` (default `Salil`) in the Vercel project's environment variables. To try the dashboard locally, start
the dev server with them set, for example `RESEARCHER_PASSWORD=choose-one npm run dev`.

Every play is always saved in the player's own browser. To collect plays from everyone, add an Upstash Redis database
(Vercel Marketplace) and set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` and
`KV_REST_API_TOKEN`). Without it the dashboard shows only the plays saved in the browser you are using.
Before playing, each player gives an optional name, an age band and a gender (each with "Prefer not to say"), and
optionally a group code. At the end they can ask for their report by email, with a tick-box agreeing that the research
team keeps the address. Written answers are saved too. The wording is in `CONSENT` in `src/game/config.js`: have your ethics
review confirm it (and the handling of players under 18) before collecting from real participants.

### Emailing the report

`api/report.js` builds the report on the server from the saved play and sends it through `api/_mail.js`, using whichever
of these is configured in the Vercel environment variables (Resend wins if both are set):

- **Gmail, for testing:** `GMAIL_USER` (the Gmail address) and `GMAIL_APP_PASSWORD` (a 16-character app password from
  <https://myaccount.google.com/apppasswords>, which needs 2-Step Verification on). About 500 emails a day; reports may land in spam.
- **Resend, for real players:** `RESEND_API_KEY` and `REPORT_FROM` (a sender on a domain verified with Resend).

With neither set the finish screen says plainly that email is not switched on; nothing is reported as sent.
Each play can be emailed at most three times (this count needs the database).

## Going live

Build with the public address so canonical, Open Graph, `sitemap.xml` and structured data use absolute URLs:

```bash
SITE_URL=https://your-domain.example npm run build
```

On Vercel nothing is needed: the production domain is read from `VERCEL_PROJECT_PRODUCTION_URL`.
Without either, the canonical and `og:url` tags are left out and `og:image` stays relative.
`vercel.json` sets long-lived cache and security headers for Vercel; `public/_headers` does the same for Netlify and Cloudflare Pages.

## What the build does

- Inlines the stylesheet and minifies the HTML (see `vite.config.js`).
- Emits `robots.txt`, plus `sitemap.xml` when `SITE_URL` is set.
- Adds schema.org JSON-LD built only from the project's source documents.

## Cards

Every card is a real printed card, transcribed from photographs of the physical decks (Value Cards, Places and Spaces,
12 Forces of Change, Methods of Learning, Issue cards). `src/cards-data.js` holds the exact wording; `src/cards.css`
rebuilds each deck's design in CSS; `src/share.js` redraws the same designs on a canvas for the saved images.
The build writes every card's text into the static HTML, so it is all crawlable.

- Only cards whose full face was visible in the photos are included. To add a card, add an entry to `DECKS` in
  `src/cards-data.js` and its artwork to `public/cards/art/`.
- The illustrations are cropped from the photographs (see `public/cards/art/`). Swap in the original artwork files
  for sharper results; keep the same file names.
- The deck logos are approximated with open fonts (Fredoka, Josefin Sans, Anton, Yellowtail, Bangers, Oswald).

## Assets

- **Fonts** are self-hosted in `public/fonts`, subset to the glyphs the site uses. To regenerate them from
  `src-fonts/`: `pip install fonttools brotli && ./scripts/subset-fonts.sh`.
- **Box photos** are in `public/img` as WebP at 640, 1100, 1600 and 2200 px, with a JPG fallback.
- `public/og.jpg` is the 1200×630 link-preview image.

## Content

All copy follows the project's source documents (the Pedagogy Playcards PDF, the research-assessment article, and the
card photographs). The random draw in the hero is a demo, not the rules of the game.
