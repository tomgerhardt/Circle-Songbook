// This page is rendered by Puppeteer to produce the combined songbook PDF.
// It is not linked from the main site nav.
import { getAllSongs, getSong } from '@/lib/songs'
import Image from 'next/image'

function parseChordPro(text: string) {
  const lines = text.split('\n')
  const sections: Array<{ type: string; label: string; lines: Array<{ chords: string[]; lyrics: string[] }> }> = []
  let current: (typeof sections)[0] | null = null

  const sectionMap: Record<string, string> = {
    verse: 'verse', chorus: 'chorus', pre_chorus: 'pre-chorus',
    bridge: 'bridge', solo: 'solo', part: 'part', intro: 'part', outro: 'part',
  }
  const labelMap: Record<string, string> = {
    verse: 'Verse', chorus: 'Chorus', 'pre-chorus': 'Pre-Chorus',
    bridge: 'Bridge', solo: 'Solo', part: 'Part', other: '',
  }

  for (const raw of lines) {
    const line = raw.trim()
    const startMatch = line.match(/\{start_of_(\w+)\}/)
    if (startMatch) {
      const type = sectionMap[startMatch[1]] ?? 'other'
      current = { type, label: labelMap[type] ?? startMatch[1], lines: [] }
      sections.push(current)
      continue
    }
    if (line.match(/\{end_of_\w+\}/) || line.match(/^\{[^}]+\}$/)) { if (line.match(/\{end_of/)) current = null; continue }
    if (line === '') { if (current) current.lines.push({ chords: [], lyrics: [] }); continue }

    const chords: string[] = []
    const lyrics: string[] = []
    const re = /\[([^\]]*)\]/g
    let m: RegExpExecArray | null
    let last = 0
    while ((m = re.exec(line)) !== null) {
      lyrics.push(line.slice(last, m.index).replace(/\[[^\]]*\]/g, ''))
      chords.push(m[1])
      last = m.index + m[0].length
    }
    const tail = line.slice(last).replace(/\[[^\]]*\]/g, '')
    if (tail || chords.length === 0) { lyrics.push(tail); if (chords.length < lyrics.length) chords.push('') }
    if (!current) { current = { type: 'other', label: '', lines: [] }; sections.push(current) }
    current.lines.push({ chords, lyrics })
  }
  return sections
}

const BORDER_COLORS: Record<string, string> = {
  verse: '#3b82f6', chorus: '#ef4444', 'pre-chorus': '#f59e0b',
  bridge: '#8b5cf6', solo: '#10b981', part: '#6b7280', other: 'transparent',
}

export default function SongbookPrintPage() {
  const metas = getAllSongs()
  const songs = metas.map(m => getSong(m.slug)!).filter(Boolean)

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Roboto Mono', monospace; font-size: 10pt; color: #111; background: #fff; }
          .title-page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 3in 1in; }
          .title-page h1 { font-size: 28pt; font-weight: 700; margin-top: 1.5rem; }
          .toc { margin-top: 2rem; width: 100%; max-width: 400px; }
          .toc-item { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 3px 0; font-size: 9pt; }
          .song-page { page-break-before: always; padding: 0.5in 0.75in; }
          .song-header { margin-bottom: 1rem; }
          .song-title { font-size: 18pt; font-weight: 700; }
          .song-meta { font-size: 9pt; color: #666; margin-top: 2px; }
          .section { margin-bottom: 1rem; padding-left: 10px; }
          .section-label { font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.45; margin-bottom: 2px; }
          .row { display: flex; flex-wrap: wrap; }
          .col { display: inline-flex; flex-direction: column; padding-right: 4px; }
          .chord { color: #1d4ed8; font-weight: 700; font-size: 8pt; line-height: 1.3; white-space: pre; min-width: 2ch; }
          .lyric { white-space: pre; font-size: 10pt; line-height: 1.5; }
          .spacer { height: 6px; }
        `}</style>
      </head>
      <body>
        {/* Title page */}
        <div className="title-page">
          <Image src="/circle-logo.svg" alt="Circle Songbook" width={120} height={120} />
          <h1>Circle Songbook</h1>
          <div className="toc">
            {metas.map((s, i) => (
              <div key={s.slug} className="toc-item">
                <span>{s.title}</span>
                <span style={{ color: '#999' }}>{s.artist}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Songs */}
        {songs.map(song => {
          const sections = parseChordPro(song.content)
          const capoNum = parseInt(song.capo, 10) || 0
          return (
            <div key={song.slug} className="song-page">
              <div className="song-header">
                <div className="song-title">{song.title}</div>
                <div className="song-meta">
                  {song.artist && <span>{song.artist}</span>}
                  {song.key && <span style={{ marginLeft: 12 }}>Key of {song.key}</span>}
                  {capoNum > 0 && <span style={{ marginLeft: 12 }}>Capo {capoNum}</span>}
                </div>
              </div>
              {sections.map((sec, si) => (
                <div
                  key={si}
                  className="section"
                  style={{ borderLeft: `3px solid ${BORDER_COLORS[sec.type] ?? '#ccc'}` }}
                >
                  {sec.label && <div className="section-label">{sec.label}</div>}
                  {sec.lines.map((line, li) => {
                    if (line.chords.length === 0 && line.lyrics.length === 0) return <div key={li} className="spacer" />
                    return (
                      <div key={li} className="row">
                        {line.lyrics.map((lyric, ci) => (
                          <span key={ci} className="col">
                            <span className="chord">{line.chords[ci] || ''}</span>
                            <span className="lyric">{lyric || (line.chords[ci] ? ' ' : '')}</span>
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )
        })}
      </body>
    </html>
  )
}
