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
