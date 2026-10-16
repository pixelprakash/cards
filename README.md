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
| `/` | Home: two choices, Play Space and Research Background. |
| `/play` | The game console, built to the October brief: about you, then 1 Discover, 2 Assemble, 3 Imagine, 4 Describe, and a finish screen. |
| `/research` | Research Background. A placeholder made from the earlier landing page; the final content is to be supplied. |
| `/researcher` | Sign-in, then the dashboard: hands, card and issue choices, pairings, timings, survey answers, written scenarios, CSV/JSON export. Not indexed. |

## The game

- Cards are the designer's final card faces. Originals live in `src-cards/` (not shipped); `python3 scripts/build-cards.py`
  turns them into WebP files in `public/cards/full/` and writes `src/cards/data.js` (names, printed descriptions, and
  the phrase each card uses inside the sentence). The blank cards (Name Your Space/Value, You Spot the Issue) are left out of
  the first build.
- The rules are in `src/game/config.js` (steps, sentence slots and their limits, the nine optional questions, the optional
  Action-Word nudges). Wording is rule-based, no AI: `src/game/sentence.js` builds the sentence, the "Make clearer"
  rewrites and the three scenario parts. `node scripts/check-game.mjs` tests it on 5,000 random hands.
- `src/game/play.js` is the screen controller; `src/game/store.js` keeps each play (record v2) in the browser and sends it
  to `/api/plays` when the shared database is connected.

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

### AI wording help (Gemini)

`api/ai.js` can use Google Gemini to word the sentence ("Make clearer") and the scenario's title, idea and difference.
The key stays on the server: the browser sends only card ids and the player's own words, the server builds the prompt,
calls Gemini, and checks the answer (length, every chosen card still named, no empty parts). If the AI is off, slow,
over its limits or fails a check, the game uses its own rule-based wording, so nothing breaks. AI text is labelled
"Written with AI help" until the player edits it, and players are told where their words go (see `AI_NOTE` in `src/game/config.js`).

Environment variables (Vercel project settings):

- `GEMINI_API_KEY` required to switch it on (a Google AI Studio key; `GOOGLE_API_KEY` also works)
- `GEMINI_MODEL` optional, default `gemini-3.8-flash`; set another model id if your account uses a different one
- `AI_PER_IP_HOUR` (default 40) and `AI_DAILY_LIMIT` (default 1000) cap the use; counted in the database when it is connected

Locally: `GEMINI_API_KEY=... npm run dev`.

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

The game and the Research Background page use the designer's final card faces (see **The game** above). The build writes every card's name into the static HTML of `/research`, so it is all crawlable. To change a card, replace its file in `src-cards/` (or edit its entry in `scripts/build-cards.py`) and run `python3 scripts/build-cards.py`.

## Assets

- **Fonts** are self-hosted in `public/fonts`, subset to the glyphs the site uses. To regenerate them from
  `src-fonts/`: `pip install fonttools brotli && ./scripts/subset-fonts.sh`. (Bricolage Grotesque and Newsreader are the ones in use; the older card-design fonts are no longer loaded.)
- **Box photos** are in `public/img` as WebP at 640, 1100, 1600 and 2200 px, with a JPG fallback.
- `public/og.jpg` is the 1200×630 link-preview image.

## Accessibility

Built and checked against WCAG 2.2 AA. What is covered and how it was checked:

- **Automated:** axe-core (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice) on every screen of the game, the home page, the research page and the dashboard.
- **Reading size:** uppercase labels are never below 14px; all other interface text is at least 16px; reading text is 17 to 22px.
- **Contrast:** every text and control colour pair is at least 4.5:1 (checked by calculation, including the deck colours).
- **Zoom and reflow:** no sideways scrolling at 320px wide (400% zoom); the text-spacing override (line height 1.5, letter spacing 0.12em, word spacing 0.16em) clips nothing.
- **Keyboard:** everything works without a mouse; Esc goes back; every control has a visible focus style; focused controls are kept clear of the sticky Back/Continue bar; the card chooser traps focus while open and returns it afterwards.
- **Screen readers:** one live region announces choices and errors; the page title follows the step; errors are tied to their fields.
- **Motion:** nothing moves forever; all animation stops under "reduce motion".

## Content

All copy follows the project's source documents (the Pedagogy Playcards PDF, the research-assessment article, and the
card faces supplied by the designers and the October brief.
