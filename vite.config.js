import { defineConfig } from 'vite'
import { heroSlotsHTML, sheetsHTML, browseHTML } from './src/cards-data.js'

// Set SITE_URL (no trailing slash) when building for production so canonical, Open Graph and
// sitemap URLs are absolute:   SITE_URL=https://example.com npm run build
// On Vercel the production domain is exposed automatically, so canonical URLs are right with no setup.
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
const SITE = (process.env.SITE_URL || (vercel ? `https://${vercel}` : '')).replace(/\/$/, '')

const TITLE = 'Pedagogy Playcards'
const DESCRIPTION =
  'A card-based speculative design toolkit for reimagining the future of learning. Combine places, values, actions and modes to craft social fictions.'

// Structured data. Only facts from the project's own documents.
const jsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Game',
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: 'en',
  genre: 'Speculative design card game',
  keywords: 'speculative design, pedagogy, higher education, futures, card game, social fiction',
  ...(SITE && { url: `${SITE}/`, image: `${SITE}/og.jpg` }),
  author: [
    { '@type': 'Person', name: 'Deepak John Mathew', jobTitle: 'Professor' },
    {
      '@type': 'Person',
      name: 'Salil Sahadevan',
      jobTitle: 'Research Scholar',
      affiliation: { '@type': 'Organization', name: 'Department of Design' },
    },
  ],
})

function playcardsSite() {
  return {
    name: 'playcards-site',

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Every card is written into the static HTML from the shared card data, so all card text is crawlable.
        const gallery = browseHTML()
        let out = html
          .replace('<!--@hero-slots-->', heroSlotsHTML())
          .replace('<!--@sheets-->', sheetsHTML())
          .replace('<!--@chips-->', gallery.chips)
          .replace('<!--@items-->', gallery.items)
          .replace('<!--@backs-->', gallery.backs)

        // Absolute-URL tags (canonical, og:url) are dropped unless SITE_URL is known.
        out = out
          .split('\n')
          .filter((line) => SITE || !line.includes('data-abs'))
          .join('\n')
          .replaceAll(' data-abs', '')
          .replaceAll('%SITE_URL%', SITE)

        out = out.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd())}</script></head>`)

        // Production only: inline the stylesheet (one less blocking request) and minify the HTML.
        if (ctx.bundle) {
          const css = Object.values(ctx.bundle).find((a) => a.fileName.endsWith('.css'))
          if (css) {
            const link = /<link rel="stylesheet"[^>]*href="[^"]*\.css"[^>]*>/
            out = out.replace(link, () => `<style>${css.source.toString().trim()}</style>`)
            delete ctx.bundle[css.fileName]
          }
          out = out.replace(/(<(script|style)\b[\s\S]*?<\/\2>)|<!--[\s\S]*?-->|\s{2,}/g, (m, keep) =>
            keep ? keep : m.startsWith('<!--') ? '' : ' ',
          )
        }
        return out
      },
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${SITE ? `\nSitemap: ${SITE}/sitemap.xml\n` : ''}`,
      })
      if (SITE) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            `  <url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [playcardsSite()],
  build: { modulePreload: { polyfill: false } },
})
