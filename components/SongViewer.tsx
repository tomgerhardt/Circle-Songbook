'use client'

import { useEffect, useState, useCallback } from 'react'
import { Chord } from 'chordsheetjs'

interface SongViewerProps {
  content: string
  title: string
  artist: string
  songKey: string
  capo: string
}

type SectionType = 'verse' | 'chorus' | 'pre-chorus' | 'bridge' | 'solo' | 'part' | 'other'

interface ParsedLine {
  chords: string[]
  lyrics: string[]
}

interface ParsedSection {
  type: SectionType
  lines: ParsedLine[]
  label: string
}

const SECTION_MAP: Record<string, SectionType> = {
  verse: 'verse',
  chorus: 'chorus',
  pre_chorus: 'pre-chorus',
  bridge: 'bridge',
  solo: 'solo',
  part: 'part',
  intro: 'part',
  outro: 'part',
}

const LABEL_MAP: Record<SectionType, string> = {
  verse: 'Verse',
  chorus: 'Chorus',
  'pre-chorus': 'Pre-Chorus',
  bridge: 'Bridge',
  solo: 'Solo',
  part: 'Part',
  other: '',
}

function transposeChord(chordStr: string, semitones: number): string {
  if (semitones === 0 || !chordStr.trim()) return chordStr
  try {
    const chord = Chord.parse(chordStr.trim())
    if (!chord) return chordStr
    return chord.transpose(semitones).toString()
  } catch {
    return chordStr
  }
}

function parseChordPro(text: string, semitones: number): ParsedSection[] {
  const lines = text.split('\n')
  const sections: ParsedSection[] = []
  let current: ParsedSection | null = null

  for (const raw of lines) {
    const line = raw.trim()

    const startMatch = line.match(/\{start_of_(\w+)\}/)
    if (startMatch) {
      const key = startMatch[1]
      const type = SECTION_MAP[key] ?? 'other'
      current = { type, lines: [], label: LABEL_MAP[type] ?? key }
      sections.push(current)
      continue
    }

    if (line.match(/\{end_of_\w+\}/)) {
      current = null
      continue
    }

    // Skip all other directives
    if (line.match(/^\{[^}]+\}$/)) continue

    if (line === '') {
      if (current) current.lines.push({ chords: [], lyrics: [] })
      continue
    }

    const chords: string[] = []
    const lyrics: string[] = []
    const chordRegex = /\[([^\]]*)\]/g
    let match: RegExpExecArray | null
    let lastIndex = 0

    while ((match = chordRegex.exec(line)) !== null) {
      lyrics.push(line.slice(lastIndex, match.index).replace(/\[[^\]]*\]/g, ''))
      chords.push(transposeChord(match[1], semitones))
      lastIndex = match.index + match[0].length
    }

    const tail = line.slice(lastIndex).replace(/\[[^\]]*\]/g, '')
    if (tail || chords.length === 0) {
      lyrics.push(tail)
      if (chords.length < lyrics.length) chords.push('')
    }

    if (!current) {
      current = { type: 'other', lines: [], label: '' }
      sections.push(current)
    }
    current.lines.push({ chords, lyrics })
  }

  return sections
}

function scrollBy80(duration = 1800) {
  const distance = window.innerHeight * 0.8
  const startY = window.scrollY
  const startTime = performance.now()

  function step(now: number) {
    const elapsed = now - startTime
    const t = Math.min(elapsed / duration, 1)
    // ease-in-out cubic
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    window.scrollTo(0, startY + distance * ease)
    if (t < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

const SECTION_CLASS: Record<SectionType, string> = {
  verse: 'section-verse',
  chorus: 'section-chorus',
  'pre-chorus': 'section-pre-chorus',
  bridge: 'section-bridge',
  solo: 'section-solo',
  part: 'section-part',
  other: '',
}

// Effective key accounting for capo
function effectiveKey(key: string, capo: number): string {
  if (!key || capo === 0) return key
  try {
    const chord = Chord.parse(key)
    if (!chord) return key
    return chord.transpose(capo).toString()
  } catch {
    return key
  }
}

export default function SongViewer({ content, title, artist, songKey, capo }: SongViewerProps) {
  const [showChords, setShowChords] = useState(true)
  const [presenter, setPresenter] = useState(false)
  const [semitones, setSemitones] = useState(0)

  const capoNum = parseInt(capo, 10) || 0
  const sections = parseChordPro(content, semitones)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
    if (e.code === 'Space') { e.preventDefault(); scrollBy80() }
    if (e.code === 'Escape' && presenter) setPresenter(false)
  }, [presenter])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    if (presenter) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.()
    }
  }, [presenter])

  const displayedKey = semitones !== 0
    ? effectiveKey(songKey, semitones)
    : songKey

  const fontSize = presenter ? 'text-2xl leading-relaxed' : 'text-base'

  return (
    <div className={presenter ? 'presenter-mode fixed inset-0 overflow-y-auto z-50' : ''}>
      <div className={`max-w-2xl mx-auto px-4 ${presenter ? 'py-12' : 'py-8'}`}>

        {/* Header */}
        <div className="mb-6">
          {!presenter && (
            <a href="/" className="text-xs text-gray-400 hover:text-black mb-3 inline-block">← Songs</a>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className={`font-bold tracking-tight ${presenter ? 'text-4xl text-white' : 'text-2xl'}`}>
                {title}
              </h1>
              <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm ${presenter ? 'text-gray-400' : 'text-gray-500'}`}>
                {artist && <span>{artist}</span>}
                {displayedKey && (
                  <span>
                    Key of <strong>{displayedKey}</strong>
                    {semitones !== 0 && (
                      <span className="text-xs ml-1 opacity-60">
                        (capo {capoNum}, transposed {semitones > 0 ? '+' : ''}{semitones})
                      </span>
                    )}
                  </span>
                )}
                {capoNum > 0 && semitones === 0 && (
                  <span className="text-xs opacity-60">Capo {capoNum} → sounds like {effectiveKey(songKey, capoNum)}</span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowChords(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    presenter ? 'border-gray-600 text-gray-300 hover:border-gray-400' :
                    showChords ? 'bg-black text-white border-black' : 'border-gray-300 text-gray-600 hover:border-gray-500'
                  }`}
                >
                  {showChords ? 'Hide chords' : 'Show chords'}
                </button>
                <button
                  onClick={() => setPresenter(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    presenter ? 'bg-white text-black border-white' : 'border-gray-300 text-gray-600 hover:border-gray-500'
                  }`}
                >
                  {presenter ? '✕ Exit' : '⛶ Present'}
                </button>
              </div>

              {/* Transpose */}
              {showChords && (
                <div className={`flex items-center gap-1.5 text-xs ${presenter ? 'text-gray-300' : 'text-gray-500'}`}>
                  <span className="opacity-60">Transpose</span>
                  <button
                    onClick={() => setSemitones(s => s - 1)}
                    className={`w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 transition-colors ${presenter ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300'}`}
                  >−</button>
                  <span className={`w-6 text-center font-mono ${semitones !== 0 ? 'font-bold' : 'opacity-40'}`}>
                    {semitones > 0 ? `+${semitones}` : semitones}
                  </span>
                  <button
                    onClick={() => setSemitones(s => s + 1)}
                    className={`w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 transition-colors ${presenter ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300'}`}
                  >+</button>
                  {semitones !== 0 && (
                    <button
                      onClick={() => setSemitones(0)}
                      className="opacity-40 hover:opacity-100 transition-opacity ml-0.5"
                    >↺</button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sheet */}
        <div className={`chord-sheet ${fontSize} ${!showChords ? 'hide-chords' : ''}`}>
          {sections.map((section, si) => (
            <div key={si} className={`${SECTION_CLASS[section.type]} mb-4`}>
              {section.label && (
                <div className="section-label">{section.label}</div>
              )}
              {section.lines.map((line, li) => {
                if (line.chords.length === 0 && line.lyrics.length === 0) {
                  return <div key={li} className="h-2" />
                }
                return (
                  <div key={li} className="row">
                    {line.lyrics.map((lyric, ci) => (
                      <span key={ci} className="column">
                        <span className="chord">{line.chords[ci] || ''}</span>
                        <span className="lyrics">{lyric || (line.chords[ci] ? ' ' : '')}</span>
                      </span>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="h-screen" />
      </div>

      {/* Tap zone */}
      <div
        onClick={() => scrollBy80()}
        className={`fixed bottom-0 left-0 right-0 h-20 cursor-pointer z-40 flex items-center justify-center ${
          presenter ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-gradient-to-t from-white/80 to-transparent'
        }`}
      >
        <span className={`text-xs opacity-30 ${presenter ? 'text-white' : 'text-black'}`}>▼</span>
      </div>
    </div>
  )
}
