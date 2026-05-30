import { Link, useLocation } from 'react-router-dom'

const socials = [
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'GitHub',    href: 'https://github.com' },
]

export default function Footer() {
  const { pathname } = useLocation()
  // 홈은 overflow:hidden이라 푸터 불필요
  if (pathname === '/') return null

  return (
    <footer className="bg-cream border-t border-[#1e1e1e] px-10 py-8">
      <div className="flex items-center justify-between">

        {/* 좌측 */}
        <div className="flex items-center gap-8">
          <Link to="/" className="font-serif text-[#f0ece6] text-sm font-light italic hover:text-[#666] transition-colors duration-300">
            HWL
          </Link>
          <span className="font-sans text-[#333] text-[10px] tracking-[0.3em] uppercase">
            © {new Date().getFullYear()}
          </span>
        </div>

        {/* 우측 */}
        <div className="flex items-center gap-6">
          <a href="mailto:ian9509@gmail.com"
            className="font-sans text-[#444] text-[10px] tracking-[0.25em] uppercase hover:text-[#f0ece6] transition-colors duration-300">
            Email
          </a>
          {socials.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="font-sans text-[#444] text-[10px] tracking-[0.25em] uppercase hover:text-[#f0ece6] transition-colors duration-300">
              {label}
            </a>
          ))}
        </div>

      </div>
    </footer>
  )
}
