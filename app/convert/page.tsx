'use client'

import { useState } from 'react'
import { UltimateGuitarParser, ChordProFormatter } from 'chordsheetjs'

const METADATA_HEADER = `{title: Song Title}
{artist: Artist Name}
{key: C}
{capo: 0}`

// Map UG section header names → ChordPro section tags
function ugSectionToTag(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('pre') && n.includes('chorus')) return 'pre_chorus'
  if (n.includes('chorus')) return 'chorus'
  if (n.includes('bridge')) return 'bridge'
  if (n.includes('solo')) return 'solo'
  if (n.includes('outro')) return 'outro'
  if (n.includes('intro')) return 'intro'
  if (n.includes('instrumental') || n.includes('interlude')) return 'solo'
  return 'verse'
}

// ChordSheetJS emits `{start_of_verse: Verse 1}` style directives.
// It also emits `{comment: Section Name}` for sections it doesn't recognise.
// This function normalises everything to bare {start_of_X} / {end_of_X} tags.
function fixSectionTags(chordpro: string): string {
  const lines = chordpro.split('\n')
  const out: string[] = []
  let inUnknownSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // {start_of_verse: Verse 1} → {start_of_verse}
    const startMatch = line.match(/^\{start_of_(\w+)(?::\s*[^}]*)?\}$/)
    if (startMatch) {
      out.push(`{start_of_${startMatch[1]}}`)
      continue
    }

    const endMatch = line.match(/^\{end_of_(\w+)(?::\s*[^}]*)?\}$/)
    if (endMatch) {
      out.push(`{end_of_${endMatch[1]}}`)
      continue
    }

    // {comment: Section Name} — ChordSheetJS uses this for unrecognised sections.
    // Wrap the following content until the next comment/section in {start_of_part}.
    const commentMatch = line.match(/^\{comment:\s*(.+?)\}$/)
    if (commentMatch) {
      const label = commentMatch[1].trim()
      const tag = ugSectionToTag(label)
      if (inUnknownSection) out.push(`{end_of_part}`)
      out.push(`{start_of_${tag}}`)
      inUnknownSection = true
      continue
    }

    // Close an open unknown section before a known start_of_ tag (already handled above)
    // or at the natural end of the string
    out.push(line)
  }

  if (inUnknownSection) out.push(`{end_of_part}`)

  return out
    .join('\n')
    // Strip title/artist/key directives ChordSheetJS may emit (we prepend our own header)
    .replace(/^\{(title|artist|key|capo|tempo|time):.*\}\n?/gim, '')
    // Remove stray leading whitespace columns like [   ] that ChordSheetJS emits
    .replace(/\[\s+\]/g, '')
    .trim()
}

function convertUltimateGuitar(input: string): string {
  // Pre-process: ChordSheetJS UltimateGuitarParser expects [Section] headers
  // to have no trailing content on the same line. Normalise them.
  const normalised = input
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')

  try {
    const parser = new UltimateGuitarParser({ preserveWhitespace: false })
    const song = parser.parse(normalised)
    const formatter = new ChordProFormatter()
    const raw = formatter.format(song)
    const body = fixSectionTags(raw)
    return `${METADATA_HEADER}\n\n${body}`
  } catch (err) {
    return `# Conversion error: ${err}\n\n# Raw input:\n${input}`
  }
}

export default function ConvertPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  function convert() {
    if (!input.trim()) return
    setOutput(convertUltimateGuitar(input))
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Convert</h1>
        <p className="text-gray-500 text-sm">Paste Ultimate Guitar plain text → ChordPro</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Ultimate Guitar text
          </label>
          <textarea
            className="flex-1 min-h-[400px] font-mono text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={"[Verse 1]\n          C                Em\nWhen you try your best, but you don't succeed"}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            onClick={convert}
            className="bg-black text-white text-sm font-medium rounded-lg py-2 hover:bg-gray-800 transition-colors"
          >
            Convert →
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              ChordPro output
            </label>
            {output && (
              <button
                onClick={copy}
                className="text-xs text-blue-600 hover:underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            className="flex-1 min-h-[400px] font-mono text-sm border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            readOnly
            value={output}
            placeholder="Output will appear here..."
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Tips</p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Edit the metadata header (title, artist, key, capo) after converting</li>
          <li>Section tags are inferred: <code className="bg-gray-100 px-1 rounded">[Chorus]</code> → chorus, <code className="bg-gray-100 px-1 rounded">[Solo]</code> → solo, etc.</li>
          <li>Chord-above-lyric spacing is merged into inline <code className="bg-gray-100 px-1 rounded">[Chord]</code> notation automatically</li>
          <li>Save as <code className="bg-gray-100 px-1 rounded">song-name.cho</code> in the <code className="bg-gray-100 px-1 rounded">/songs</code> directory</li>
        </ul>
      </div>
    </main>
  )
}
