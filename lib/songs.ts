import fs from 'fs'
import path from 'path'

export interface SongMeta {
  slug: string
  title: string
  artist: string
  key: string
  capo: string
}

export interface Song extends SongMeta {
  content: string
}

const SONGS_DIR = path.join(process.cwd(), 'songs')

function parseMeta(content: string): Omit<SongMeta, 'slug'> {
  const get = (tag: string) => {
    const m = content.match(new RegExp(`\\{${tag}:\\s*([^}]+)\\}`))
    return m ? m[1].trim() : ''
  }
  return {
    title: get('title') || 'Untitled',
    artist: get('artist') || '',
    key: get('key') || '',
    capo: get('capo') || '0',
  }
}

export function getAllSongs(): SongMeta[] {
  const files = fs.readdirSync(SONGS_DIR).filter(f => f.endsWith('.cho'))
  return files
    .map(file => {
      const slug = file.replace(/\.cho$/, '')
      const content = fs.readFileSync(path.join(SONGS_DIR, file), 'utf-8')
      return { slug, ...parseMeta(content) }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function getSong(slug: string): Song | null {
  const filePath = path.join(SONGS_DIR, `${slug}.cho`)
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, 'utf-8')
  return { slug, ...parseMeta(content), content }
}

export function getAllSlugs(): string[] {
  return fs.readdirSync(SONGS_DIR)
    .filter(f => f.endsWith('.cho'))
    .map(f => f.replace(/\.cho$/, ''))
}
