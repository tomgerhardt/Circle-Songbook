import Link from 'next/link'
import { getAllSongs } from '@/lib/songs'

export default function HomePage() {
  const songs = getAllSongs()

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <p className="text-gray-400 text-sm mb-6">{songs.length} songs — alphabetical</p>

      <ul className="divide-y divide-gray-100">
        {songs.map(song => (
          <li key={song.slug}>
            <Link
              href={`/songs/${song.slug}`}
              className="flex items-baseline justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded group"
            >
              <span className="font-medium group-hover:underline">{song.title}</span>
              <span className="text-xs text-gray-400 ml-4 shrink-0">{song.artist}</span>
            </Link>
          </li>
        ))}
      </ul>

      {songs.length === 0 && (
        <p className="text-gray-400 text-sm">No songs yet. Add .cho files to the /songs directory.</p>
      )}
    </main>
  )
}
