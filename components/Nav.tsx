import Link from 'next/link'
import Image from 'next/image'

const links = [
  { href: '/', label: 'Songs' },
  { href: '/print', label: 'PDF / Print' },
  { href: '/listen', label: 'Listen' },
  { href: '/submit', label: 'Submit a Song' },
]

export default function Nav() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 flex items-center gap-1 h-12">
        <Link href="/" className="mr-4 shrink-0 flex items-center" aria-label="Circle Songbook home">
          <Image
            src="/circle-logo.svg"
            alt="Circle Songbook"
            width={32}
            height={32}
            className="h-8 w-8"
          />
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm px-3 py-1.5 rounded-md text-gray-600 hover:text-black hover:bg-gray-100 whitespace-nowrap transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
