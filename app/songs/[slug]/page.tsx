import { getAllSlugs, getSong } from '@/lib/songs'
import SongViewer from '@/components/SongViewer'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const song = getSong(slug)
  return { title: song ? `${song.title} — Circle Songbook` : 'Not Found' }
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const song = getSong(slug)
  if (!song) notFound()

  return (
    <SongViewer
      content={song.content}
      title={song.title}
      artist={song.artist}
      songKey={song.key}
      capo={song.capo}
    />
  )
}
