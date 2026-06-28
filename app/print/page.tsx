import { getAllSongs } from '@/lib/songs'

export default function PrintPage() {
  const songs = getAllSongs()

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-1">PDF / Print</h1>
      <p className="text-gray-500 text-sm mb-8">
        PDFs are generated automatically on every push to main via GitHub Actions.
      </p>

      <div className="mb-8">
        <a
          href="/pdfs/songbook.pdf"
          download
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          ↓ Download Full Songbook PDF
        </a>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Individual songs</h2>
      <ul className="divide-y divide-gray-100">
        {songs.map(song => (
          <li key={song.slug} className="flex items-center justify-between py-3">
            <div>
              <span className="font-medium text-sm">{song.title}</span>
              {song.artist && (
                <span className="text-xs text-gray-400 ml-2">{song.artist}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/songs/${song.slug}`}
                className="text-xs text-gray-400 hover:text-black transition-colors"
              >
                View
              </a>
              <a
                href={`/pdfs/${song.slug}.pdf`}
                download
                className="text-xs text-blue-600 hover:underline"
              >
                ↓ PDF
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-gray-400">
        PDFs not showing? Run <code className="bg-gray-100 px-1 rounded">npm run build && npm run pdfs</code> locally,
        or push to main to trigger CI generation.
      </p>
    </main>
  )
}
