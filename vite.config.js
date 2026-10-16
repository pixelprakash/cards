import { defineConfig } from 'vite'
import { heroHTML, sheetsHTML, galleryHTML, exampleHTML } from './src/research-html.js'

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

// Production only: inline this page's stylesheet (one less blocking request) and minify the HTML.
function inlineCss(html, ctx) {
  const own = ctx.chunk?.viteMetadata?.importedCss
  const css = Object.values(ctx.bundle).find((a) => a.fileName.endsWith('.css') && (!own?.size || own.has(a.fileName)))
  let out = html
  if (css) {
    const link = /<link rel="stylesheet"[^>]*href="[^"]*\.css"[^>]*>/
    out = out.replace(link, () => `<style>${css.source.toString().trim()}</style>`)
    delete ctx.bundle[css.fileName]
  }
  return out.replace(/(<(script|style)\b[\s\S]*?<\/\2>)|<!--[\s\S]*?-->|\s{2,}/g, (m, keep) =>
    keep ? keep : m.startsWith('<!--') ? '' : ' ',
  )
}

function playcardsSite() {
  return {
    name: 'playcards-site',

    // Same clean addresses in dev as on the host: /play and /researcher.
    configureServer(server) {
      // Run the serverless functions in api/ locally, so sign-in works in dev exactly as on Vercel.
      server.middlewares.use(async (req, res, next) => {
        const [path] = (req.url || '').split('?')
        const m = path.match(/^\/api\/([a-z]+)$/)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString()
          req.body = (req.headers['content-type'] || '').includes('json') && raw ? JSON.parse(raw) : raw
          res.status = (code) => ((res.statusCode = code), res)
          res.json = (obj) => (res.setHeader('content-type', 'application/json'), res.end(JSON.stringify(obj)))
          await mod.default(req, res)
        } catch (err) {
          if (err?.code === 'ERR_LOAD_URL' || /Failed to load url/.test(String(err))) return next()
          res.statusCode = 500
          res.end('API error')
        }
      })
      server.middlewares.use((req, _res, next) => {
        const [path, query = ''] = (req.url || '').split('?')
        if (path === '/play' || path === '/researcher' || path === '/research') req.url = `${path}.html${query ? `?${query}` : ''}`
        next()
      })
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const page = (ctx.filename || ctx.path || '').split(/[\\/]/).pop()
        // The researcher page is private: no card markup, no social tags, no structured data.
        if (page.startsWith('researcher')) return ctx.bundle ? inlineCss(html, ctx) : html
        const isHome = page.startsWith('index')   // structured data belongs on the home page only

        // Every card is written into the static HTML from the shared card data, so all card text is crawlable.
        let out = html
        {
          const gallery = galleryHTML()
          out = out
            .replace('<!--@hero-->', heroHTML())
            .replace('<!--@example-->', exampleHTML())
            .replace('<!--@sheets-->', sheetsHTML())
            .replace('<!--@chips-->', gallery.chips)
            .replace('<!--@items-->', gallery.items)
            .replace('<!--@backs-->', gallery.backs)
        }

        // Absolute-URL tags (canonical, og:url) are dropped unless SITE_URL is known.
        out = out
          .split('\n')
          .filter((line) => SITE || !line.includes('data-abs'))
          .join('\n')
          .replaceAll(' data-abs', '')
          .replaceAll('%SITE_URL%', SITE)

        if (isHome) out = out.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd())}</script></head>`)

        return ctx.bundle ? inlineCss(out, ctx) : out
      },
    },

    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nDisallow: /researcher\nDisallow: /api/\n${SITE ? `\nSitemap: ${SITE}/sitemap.xml\n` : ''}`,
      })
      if (SITE) {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source:
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            `  <url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n` +
            `  <url><loc>${SITE}/play</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>\n</urlset>\n`,
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [playcardsSite()],
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: { input: { main: 'index.html', research: 'research.html', play: 'play.html', researcher: 'researcher.html' } },
  },
})
