import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Link, useNavigate } from 'react-router-dom'
import { Component } from '@/components/ui/animated-menu'
import { useIsMobile } from '../hooks/useIsMobile'
import { resetIntro } from './Hero'

const links = [
  { label: 'works',   href: '/works' },
  { label: 'archive', href: '/archive' },
  { label: 'about',   href: '/about' },
]

const mono = '"Noto Sans Mono", monospace'

function MobileMenu({ onClose }) {
  const navigate   = useNavigate()
  const overlayRef = useRef(null)
  const itemsRef   = useRef([])

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' }
    )
    tl.fromTo(itemsRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.09, ease: 'power3.out' },
      '-=0.15'
    )
  }, [])

  const handleNav = (href) => {
    const tl = gsap.timeline({ onComplete: () => { onClose(); navigate(href) } })
    tl.to(itemsRef.current.slice().reverse(),
      { y: -30, opacity: 0, duration: 0.3, stagger: 0.06, ease: 'power2.in' }
    )
    tl.to(overlayRef.current, { opacity: 0, duration: 0.25 }, '-=0.1')
  }

  const handleClose = () => {
    const tl = gsap.timeline({ onComplete: onClose })
    tl.to(itemsRef.current.slice().reverse(),
      { y: -30, opacity: 0, duration: 0.3, stagger: 0.06, ease: 'power2.in' }
    )
    tl.to(overlayRef.current, { opacity: 0, duration: 0.25 }, '-=0.1')
  }

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        backgroundColor: '#000000',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 36px',
      }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute', top: 20, right: 24,
          fontFamily: mono, fontSize: '10px', letterSpacing: '0.35em',
          textTransform: 'uppercase', color: '#444',
          background: 'none', border: 'none', padding: '8px',
        }}
      >
        close
      </button>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.map(({ label, href }, i) => (
          <button
            key={label}
            ref={el => { itemsRef.current[i] = el }}
            onClick={() => handleNav(href)}
            style={{
              fontFamily: mono,
              fontSize: 'clamp(2.8rem, 14vw, 5rem)',
              fontStyle: 'italic', fontWeight: 300,
              letterSpacing: '-0.02em', lineHeight: 1.05,
              color: '#f0ece6',
              background: 'none', border: 'none',
              textAlign: 'left', padding: 0,
              opacity: 0,
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom index labels */}
      <div style={{
        position: 'absolute', bottom: 40, left: 36,
        display: 'flex', gap: '24px',
      }}>
        {links.map(({ label }, i) => (
          <span
            key={label}
            ref={el => { itemsRef.current[links.length + i] = el }}
            style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#333', opacity: 0 }}
          >
            0{i + 1}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Navbar() {
  const navRef   = useRef(null)
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    gsap.fromTo(
      navRef.current,
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0, duration: 1.2, delay: 0.4, ease: 'power3.out' }
    )
  }, [])

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between ${isMobile ? 'px-6' : 'px-10 py-4'}`}
        style={{
          opacity: 0,
          backgroundColor: isMobile ? '#000000' : 'transparent',
          borderBottom:    isMobile ? '1px solid rgba(240,236,230,0.06)' : 'none',
          paddingTop:    isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : undefined,
          paddingBottom: isMobile ? '12px' : undefined,
        }}
      >
        {isMobile ? (
          /* ── Mobile ── */
          <>
            <Link to="/" onClick={resetIntro} style={{ display: 'block', lineHeight: 0, flexShrink: 0 }}>
              <img
                src="/hwl-front.png"
                alt="HWL"
                draggable={false}
                style={{
                  width: '160px',
                  height: '80px',
                  display: 'block',
                  objectFit: 'cover',
                  objectPosition: 'center bottom',
                  mixBlendMode: 'screen',
                }}
              />
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              style={{
                fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em',
                textTransform: 'uppercase', color: '#555',
                background: 'none', border: 'none', padding: '8px 0',
              }}
            >
              menu
            </button>
          </>
        ) : (
          /* ── Desktop (unchanged) ── */
          <>
            <Link to="/" onClick={resetIntro} style={{ display: 'block', lineHeight: 1, position: 'relative', top: '-50px', left: '-50px' }}>
              <img
                src="/hwl-front.png"
                alt="HWL"
                draggable={false}
                style={{ height: '50px', width: 'auto', display: 'block', transform: 'scale(3)', transformOrigin: 'top left', mixBlendMode: 'screen' }}
              />
            </Link>

            <div className="flex gap-10">
              {links.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-[#555] hover:text-[#f0ece6] transition-colors duration-300"
                >
                  <Component
                    lineHeight={0.85}
                    className="font-sans text-[11px] tracking-[0.22em] uppercase"
                  >
                    {item.label}
                  </Component>
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  )
}
