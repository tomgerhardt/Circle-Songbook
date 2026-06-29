/**
 * PDF generation script.
 *
 * Run after `next build` (which writes static output to /out).
 * Usage: node scripts/generate-pdfs.mjs
 *
 * Outputs:
 *   public/pdfs/<slug>.pdf   — one PDF per song
 *   public/pdfs/songbook.pdf — combined PDF: title page + all songs
 */

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.resolve(__dirname, '..')
const OUT_DIR    = path.join(ROOT, 'out')
const SONGS_DIR  = path.join(ROOT, 'songs')
const PDF_DIR    = path.join(ROOT, 'public', 'pdfs')
const LOGO_PATH  = path.join(ROOT, 'public', 'circle-logo.svg')

if (!fs.existsSync(OUT_DIR)) {
  console.error('❌  /out not found — run `npm run build` first.')
  process.exit(1)
}
fs.mkdirSync(PDF_DIR, { recursive: true })

// ── Song data ─────────────────────────────────────────────────────────────────

function parseMeta(content) {
  const get = tag => {
    const m = content.match(new RegExp(`\\{${tag}:\\s*([^}]+)\\}`))
    return m ? m[1].trim() : ''
  }
  return { title: get('title') || 'Untitled', artist: get('artist'), key: get('key'), capo: get('capo') }
}

function getSongs() {
  return fs.readdirSync(SONGS_DIR)
    .filter(f => f.endsWith('.cho'))
    .map(f => {
      const slug    = f.replace(/\.cho$/, '')
      const content = fs.readFileSync(path.join(SONGS_DIR, f), 'utf-8')
      return { slug, content, ...parseMeta(content) }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

// ── ChordPro renderer (HTML) ──────────────────────────────────────────────────

const BORDER = {
  verse: '#3b82f6', chorus: '#ef4444', pre_chorus: '#f59e0b',
  bridge: '#8b5cf6', solo: '#10b981', part: '#6b7280',
}

function renderSongHTML(song) {
  const lines  = song.content.split('\n')
  let html     = ''
  let inSection = false
  let sectionTag = ''

  for (const raw of lines) {
    const line = raw.trim()

    const startM = line.match(/\{start_of_(\w+)\}/)
    if (startM) {
      sectionTag = startM[1]
      const color = BORDER[sectionTag] ?? '#ccc'
      const label = sectionTag.replace(/_/g, '-')
      html += `<div class="section" style="border-left:3px solid ${color};padding-left:10px;margin-bottom:12px;">`
      html += `<div class="section-label">${label}</div>`
      inSection = true
      continue
    }
    if (line.match(/\{end_of_\w+\}/)) {
      if (inSection) { html += '</div>'; inSection = false }
      continue
    }
    if (line.match(/^\{[^}]+\}$/)) continue

    if (line === '') { html += '<div style="height:6px"></div>'; continue }

    // Parse chord/lyric columns
    const chords = [], lyrics = []
    const re = /\[([^\]]*)\]/g
    let m, last = 0
    while ((m = re.exec(line)) !== null) {
      lyrics.push(line.slice(last, m.index).replace(/\[[^\]]*\]/g, ''))
      chords.push(m[1])
      last = m.index + m[0].length
    }
    const tail = line.slice(last).replace(/\[[^\]]*\]/g, '')
    if (tail || chords.length === 0) {
      lyrics.push(tail)
      if (chords.length < lyrics.length) chords.push('')
    }

    html += '<div class="row">'
    for (let i = 0; i < lyrics.length; i++) {
      const ch  = chords[i] || ''
      const lyr = lyrics[i] || (ch ? ' ' : '')
      html += `<span class="col"><span class="chord">${esc(ch)}</span><span class="lyric">${esc(lyr)}</span></span>`
    }
    html += '</div>'
  }

  const capoNum = parseInt(song.capo, 10) || 0
  const meta = [song.artist, song.key ? `Key of ${song.key}` : '', capoNum > 0 ? `Capo ${capoNum}` : '']
    .filter(Boolean).join('  ·  ')

  return `
    <div class="song-page">
      <div class="song-header">
        <div class="song-title">${esc(song.title)}</div>
        ${meta ? `<div class="song-meta">${esc(meta)}</div>` : ''}
      </div>
      ${html}
    </div>`
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

// ── Build the combined songbook HTML ─────────────────────────────────────────

function buildSongbookHTML(songs) {
  const logoSvg = fs.existsSync(LOGO_PATH)
    ? fs.readFileSync(LOGO_PATH, 'utf-8')
    : ''

  const tocRows = songs.map(s =>
    `<tr><td style="padding:3px 0">${esc(s.title)}</td><td style="color:#999;text-align:right;padding:3px 0">${esc(s.artist)}</td></tr>`
  ).join('')

  const songsHTML = songs.map(renderSongHTML).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Roboto Mono', ui-monospace, monospace; font-size: 10.5pt; color: #111; background: #fff; }

  /* Title page */
  .title-page {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; padding: 1in;
    break-after: page; page-break-after: always;
  }
  .title-page svg { width: 100px; height: 100px; }
  .title-page h1 { font-size: 26pt; font-weight: 700; margin: 1.5rem 0 0.5rem; }
  .toc { width: 100%; max-width: 420px; margin-top: 1.5rem; border-collapse: collapse; }
  .toc td { font-size: 9pt; border-bottom: 1px dotted #ddd; }

  /* Song pages */
  .song-page { break-before: page; page-break-before: always; padding: 0 0 0.5in 0; }
  .song-header { margin-bottom: 1rem; }
  .song-title { font-size: 17pt; font-weight: 700; }
  .song-meta { font-size: 8.5pt; color: #666; margin-top: 3px; }

  .section { margin-bottom: 14px; }
  .section-label { font-size: 6pt; font-weight: 700; text-transform: uppercase;
                   letter-spacing: 0.08em; opacity: 0.45; margin-bottom: 3px; }
  .row { display: flex; flex-wrap: wrap; }
  .col { display: inline-flex; flex-direction: column; padding-right: 4px; }
  .chord { color: #1d4ed8; font-weight: 700; font-size: 8pt; line-height: 1.3;
           white-space: pre; min-width: 2ch; }
  .lyric { white-space: pre; font-size: 10.5pt; line-height: 1.55; }
</style>
</head>
<body>

<div class="title-page">
  ${logoSvg}
  <h1>Circle Songbook</h1>
  <table class="toc">${tocRows}</table>
</div>

${songsHTML}

</body>
</html>`
}

// ── Static file server (for individual song PDFs) ─────────────────────────────

function startServer(port = 3998) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath  = req.url.split('?')[0]
      let filePath = path.join(OUT_DIR, urlPath)
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory())
        filePath = path.join(filePath, 'index.html')
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return }
      const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
                      '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon',
                      '.woff2':'font/woff2', '.txt':'text/plain', '.json':'application/json' }
      res.writeHead(200, { 'Content-Type': types[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream' })
      fs.createReadStream(filePath).pipe(res)
    })
    server.on('error', reject)
    server.listen(port, () => { console.log(`  Static server → http://localhost:${port}`); resolve(server) })
  })
}

// ── PDF helpers ───────────────────────────────────────────────────────────────

const PAGE_MARGIN = '0.65in'
const footerTemplate = `<div style="width:100%;font-family:'Roboto Mono',monospace;font-size:8pt;
  color:#999;text-align:center;padding:0 0.65in;"><span class="pageNumber"></span></div>`

async function pageToPdf(page, outPath) {
  const pdf = await page.pdf({
    format: 'Letter', printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate,
    margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
  })
  fs.writeFileSync(outPath, pdf)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const songs  = getSongs()
  const slugs  = songs.map(s => s.slug)
  const server = await startServer(3998)
  const base   = 'http://localhost:3998'

  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(systemChrome) ? systemChrome : undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  // ── Combined songbook ─────────────────────────────────────────────────────
  console.log(`\nGenerating songbook PDF (${songs.length} songs)…`)
  const songbookHTML = buildSongbookHTML(songs)
  const tmpHTML = path.join(PDF_DIR, '_songbook_tmp.html')
  fs.writeFileSync(tmpHTML, songbookHTML)

  // Load via file:// so relative assets (SVG, fonts) resolve
  await page.goto(`file://${tmpHTML}`, { waitUntil: 'networkidle0', timeout: 60000 })
  await pageToPdf(page, path.join(PDF_DIR, 'songbook.pdf'))
  fs.unlinkSync(tmpHTML)
  console.log('  ✓ songbook.pdf')

  // ── Individual song PDFs ──────────────────────────────────────────────────
  console.log(`\nGenerating individual PDFs…`)
  for (const slug of slugs) {
    await page.goto(`${base}/songs/${slug}/`, { waitUntil: 'networkidle0', timeout: 30000 })
    await page.addStyleTag({ content: 'header,footer,nav,.tap-zone,button,a[href="/"]{display:none!important}' })
    await pageToPdf(page, path.join(PDF_DIR, `${slug}.pdf`))
    console.log(`  ✓ ${slug}.pdf`)
  }

  await browser.close()
  server.close()
  console.log(`\nDone. PDFs written to public/pdfs/\n`)
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
