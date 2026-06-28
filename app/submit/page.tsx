'use client'

// Formspree handles form submission — your email never appears in the HTML source.
// Setup (one time):
//   1. Go to https://formspree.io and sign up (free tier: 50 submissions/month)
//   2. Create a new form, set the destination to thomas.gerhardt@gmail.com
//   3. Replace YOUR_FORM_ID below with the ID from your form's endpoint URL
const FORMSPREE_ID = 'mgojvwzw'

import { useState } from 'react'

type Status = 'idle' | 'sending' | 'success' | 'error'

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ song_title: title, artist, notes }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const isPlaceholder = !FORMSPREE_ID || FORMSPREE_ID.startsWith('YOUR')

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Suggest a Song</h1>
      <p className="text-gray-500 text-sm mb-8">
        Think a song should be in the book? Let us know and we'll add it.
      </p>

      {isPlaceholder && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <strong>Dev note:</strong> Replace <code>YOUR_FORM_ID</code> in{' '}
          <code>app/submit/page.tsx</code> with your Formspree form ID.
        </div>
      )}

      {status === 'success' ? (
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-green-800 font-medium mb-1">Thanks for the suggestion!</p>
          <p className="text-green-700 text-sm">We'll look into adding it to the book.</p>
          <button
            onClick={() => { setTitle(''); setArtist(''); setNotes(''); setStatus('idle') }}
            className="mt-4 text-sm text-green-700 underline"
          >
            Suggest another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="title">
              Song title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Hallelujah"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="artist">
              Artist
            </label>
            <input
              id="artist"
              type="text"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              placeholder="e.g. Leonard Cohen"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="notes">
              Any notes? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why this song? A particular arrangement? A link to chords?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">Something went wrong — please try again.</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending' || isPlaceholder}
            className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'sending' ? 'Sending…' : 'Submit suggestion'}
          </button>

          {isPlaceholder && (
            <p className="text-xs text-center text-gray-400">Form disabled until Formspree is configured.</p>
          )}
        </form>
      )}
    </main>
  )
}
