/**
 * PDF generation script.
 *
 * Run after `next build` (which writes static output to /out).
 * Usage: node scripts/generate-pdfs.mjs
 *
 * Outputs:
 *   public/pdfs/<slug>.pdf   — one PDF per song
 *   public/pdfs/songbook.pdf — combined PDF with title page + all songs
 */

import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'out')
const PDF_DIR = path.join(ROOT, 'public', 'pdfs')

if (!fs.existsSync(OUT_DIR)) {
  console.error('❌  /out not found — run `npm run build` first.')
  process.exit(1)
}

fs.mkdirSync(PDF_DIR, { recursive: true })

// ── Static file server ────────────────────────────────────────────────────────

function startServer(port = 3998) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Strip query strings
      let urlPath = req.url.split('?')[0]

      // Map / → /index.html, /songs/foo → /songs/foo/index.html, etc.
      let filePath = path.join(OUT_DIR, urlPath)

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html')
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404)
        res.end('Not found: ' + urlPath)
        return
      }

      const ext = path.extname(filePath).toLowerCase()
      const types = {
        '.html': 'text/html', '.js': 'application/javascript',
        '.css': 'text/css', '.json': 'application/json',
        '.svg': 'image/svg+xml', '.png': 'image/png',
        '.ico': 'image/x-icon', '.woff2': 'font/woff2',
        '.txt': 'text/plain',
      }
      res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    })

    server.on('error', reject)
    server.listen(port, () => {
      console.log(`  Static server → http://localhost:${port}`)
      resolve(server)
    })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSlugs() {
  const dir = path.join(OUT_DIR, 'songs')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(d =>
    fs.statSync(path.join(dir, d)).isDirectory()
  ).sort()
}

const PAGE_MARGIN = '0.65in'

const footerTemplate = `
  <div style="width:100%; font-family:'Roboto Mono',monospace; font-size:8pt;
              color:#999; text-align:center; padding:0 0.65in;">
    <span class="pageNumber"></span>
  </div>`

async function savePdf(page, url, outPath) {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

  // Hide interactive chrome before printing
  await page.addStyleTag({ content: `
    header, footer, nav, .tap-zone, button, a[href="/"] { display: none !important; }
  ` })

  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate,
    margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
  })

  fs.writeFileSync(outPath, pdf)
  return pdf
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const port = 3998
  const server = await startServer(port)
  const base = `http://localhost:${port}`

  // Use system Chrome if the Puppeteer-managed browser isn't available
  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const executablePath = fs.existsSync(systemChrome) ? systemChrome : undefined

  const browser = await puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const slugs = getSlugs()
  console.log(`\nGenerating ${slugs.length} song PDFs…`)

  const songPdfBuffers = []

  // ── Combined songbook PDF (title page + all songs in one render) ─────────
  console.log('  Rendering songbook PDF…')
  const songbookPath = path.join(PDF_DIR, 'songbook.pdf')
  const songbookPdf = await savePdf(page, `${base}/songbook-print/`, songbookPath)
  console.log('  ✓ songbook.pdf')

  // ── Individual song PDFs ──────────────────────────────────────────────────
  for (const slug of slugs) {
    const outPath = path.join(PDF_DIR, `${slug}.pdf`)
    await savePdf(page, `${base}/songs/${slug}/`, outPath)
    console.log(`  ✓ ${slug}.pdf`)
  }

  await browser.close()
  server.close()
  console.log(`\nDone. PDFs written to public/pdfs/\n`)
}

main().catch(err => {
  console.error('\n❌ PDF generation failed:', err.message)
  process.exit(1)
})
