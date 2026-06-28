import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>Circle Songbook</span>
        <Link href="/convert" className="hover:text-black transition-colors">
          Convert UG → ChordPro
        </Link>
      </div>
    </footer>
  )
}
