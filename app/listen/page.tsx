const SPOTIFY_PLAYLIST_ID = '3H4aJcLgEpCACOtlwtIwBJ'

export default function ListenPage() {
  const spotifyEmbedUrl = `https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator&theme=0`
  const spotifyUrl = `https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Listen</h1>
      <p className="text-gray-500 text-sm mb-8">
        Learn the songs before the session.
      </p>

      <div className="rounded-xl overflow-hidden mb-6 shadow-sm">
        <iframe
          src={spotifyEmbedUrl}
          width="100%"
          height="380"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{ border: 0 }}
        />
      </div>

      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Open in Spotify →
      </a>
    </main>
  )
}
