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

const mono = '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace'

// ── Desktop navbar position config ─────────────────────────────────────────
const DESKTOP = {
  logo: {
    height:     '130px',   // size of the logo
    marginTop:  '-40px',     // move down (+) or up (-)
    marginLeft: '-30px',     // move right (+) or left (-)
  },
  links: {
    marginTop:   '-60px',    // move down (+) or up (-)
    marginRight: '0px',    // move left (+) or right (-)
    gap:         '40px',   // space between the 3 buttons
    fontSize:    '60px',   // text size
  },
  nav: {
    paddingX: '40px',      // left/right padding of the whole bar
    paddingY: '16px',      // top/bottom padding of the whole bar
  },
}
// ───────────────────────────────────────────────────────────────────────────

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
      {/* Close button — same position as the nav "menu" button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: '24px',
          fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em',
          textTransform: 'uppercase', color: '#555',
          background: 'none', border: 'none', padding: '8px 0',
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
  const navRef        = useRef(null)
  const linkInnerRefs = useRef([])
  const isMobile      = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    gsap.fromTo(navRef.current, { opacity: 0 }, { opacity: 1, duration: 1.0, delay: 0.35, ease: 'power3.out' })
    if (linkInnerRefs.current.length) {
      gsap.set(linkInnerRefs.current, { y: '105%' })
      gsap.to(linkInnerRefs.current, { y: '0%', duration: 1.0, stagger: 0.1, delay: 0.45, ease: 'power3.out' })
    }
  }, [])

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between ${isMobile ? 'px-6' : ''}`}
        style={{
          opacity: 0,
          zIndex: 9600,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          backgroundColor: isMobile ? '#000000' : 'transparent',
          borderBottom:    isMobile ? '1px solid rgba(240,236,230,0.06)' : 'none',
          height:       isMobile ? 'calc(52px + env(safe-area-inset-top, 0px))' : undefined,
          ...(isMobile
            ? { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '0' }
            : { paddingLeft: DESKTOP.nav.paddingX, paddingRight: DESKTOP.nav.paddingX, paddingTop: DESKTOP.nav.paddingY, paddingBottom: DESKTOP.nav.paddingY }),
        }}
      >
        {isMobile ? (
          /* ── Mobile ── */
          <>
            <Link to="/" onClick={resetIntro} style={{ display: 'block', lineHeight: 0, flexShrink: 0 }}>
              <img
                src="/hwl-front.mobile.png"
                alt="HWL"
                draggable={false}
                style={{
                  height: '55px',
                  width: 'auto',
                  display: 'block',
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
            <Link to="/" onClick={resetIntro} style={{ display: 'block', lineHeight: 0, marginTop: DESKTOP.logo.marginTop, marginLeft: DESKTOP.logo.marginLeft }}>
              <img
                src="/hwl-front.mobile.png"
                alt="HWL"
                draggable={false}
                style={{ height: DESKTOP.logo.height, width: 'auto', display: 'block' }}
              />
            </Link>

            <div style={{ display: 'flex', gap: DESKTOP.links.gap, marginTop: DESKTOP.links.marginTop, marginRight: DESKTOP.links.marginRight }}>
              {links.map((item, i) => (
                <div key={item.label} style={{ overflow: 'hidden' }}>
                  <div ref={el => { linkInnerRefs.current[i] = el }}>
                    <Link
                      to={item.href}
                      className="text-[#555] hover:text-[#f0ece6] transition-colors duration-300"
                    >
                      <Component
                        lineHeight={0.85}
                        style={{ fontSize: DESKTOP.links.fontSize }}
                        className="font-sans tracking-normal"
                      >
                        {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                      </Component>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </nav>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}
    </>
  )
}
