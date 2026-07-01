import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Component } from '@/components/ui/animated-menu'
import { useIsMobile } from '../hooks/useIsMobile'
import { transitionState } from '../transitionState'

const COLLAPSED = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'
const FULL      = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const EXIT_DUR  = 0.8
const EXIT_EASE = 'power4.in'

const links = [
  { label: 'works',   href: '/works' },
  { label: 'archive', href: '/archive' },
  { label: 'about',   href: '/about' },
]

const mono = '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace'

// ── Change this one number — everything else scales from it ────────────────
const NAV_H = 64   // navbar height in px

const DESKTOP = {
  nav:   { height: `${NAV_H}px`,                      paddingX: '40px' },
  logo:  { height: `${Math.round(NAV_H * 0.62)}px`,   marginTop: 4    },
  links: { fontSize: `${Math.round(NAV_H * 0.68)}px`, gap: '40px'      },
  tab:   { radius: `${Math.round(NAV_H * 0.5)}px`,    rightPad: `${Math.round(NAV_H * 1.1)}px` },
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
  const navRef            = useRef(null)
  const indicatorRef      = useRef(null)
  const logoTabRef        = useRef(null)
  const linkContainerRefs = useRef([])
  const linkInnerRefs     = useRef([])
  const navOverlayRef     = useRef(null)
  const mountedRef        = useRef(false)
  const isMobile          = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleNavClick = (href) => {
    if (location.pathname === href) return
    transitionState.navbarHandledExit = true
    gsap.fromTo(navOverlayRef.current,
      { clipPath: COLLAPSED },
      {
        clipPath: FULL,
        duration: EXIT_DUR,
        ease: EXIT_EASE,
        onComplete: () => {
          navigate(href)
          requestAnimationFrame(() => {
            gsap.set(navOverlayRef.current, { clipPath: COLLAPSED })
          })
        },
      }
    )
  }

  const activeIdx = links.findIndex(l => location.pathname.startsWith(l.href))

  const positionIndicator = (animate) => {
    const ind = indicatorRef.current
    const nav = navRef.current
    if (!ind || !nav) return
    const navRect = nav.getBoundingClientRect()

    let el, extraPad
    if (activeIdx === -1) {
      el       = logoTabRef.current
      extraPad = 0
    } else {
      el       = linkContainerRefs.current[activeIdx]
      extraPad = 20  // breathing room around link text
    }
    if (!el) return

    const r = el.getBoundingClientRect()
    const props = {
      x:     r.left - navRect.left - extraPad,
      width: r.width + extraPad * 2,
    }

    if (animate) {
      gsap.to(ind, { ...props, duration: 0.6, ease: 'expo.out' })
    } else {
      gsap.set(ind, props)
    }
  }

  // Mount: snap indicator, run intro animations
  useEffect(() => {
    positionIndicator(false)
    mountedRef.current = true

    gsap.fromTo(navRef.current, { opacity: 0 }, { opacity: 1, duration: 1.0, delay: 0.35, ease: 'power3.out' })
    if (linkInnerRefs.current.length) {
      gsap.set(linkInnerRefs.current, { y: '105%' })
      gsap.to(linkInnerRefs.current, { y: '0%', duration: 1.0, stagger: 0.1, delay: 0.45, ease: 'power3.out' })
    }
  }, [])

  // Route change: animate indicator to new position
  useEffect(() => {
    if (!mountedRef.current) return
    positionIndicator(true)
  }, [location.pathname])

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
          backgroundColor: isMobile ? '#000000' : '#ffffff',
          borderBottom:    isMobile ? '1px solid rgba(240,236,230,0.06)' : 'none',
          height: isMobile ? 'calc(52px + env(safe-area-inset-top, 0px))' : DESKTOP.nav.height,
          ...(isMobile ? { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '0' } : {}),
        }}
      >
        {isMobile ? (
          /* ── Mobile ── */
          <>
            <Link to="/" style={{ display: 'block', lineHeight: 0, flexShrink: 0 }}>
              <img src="/hwl_logo.svg" alt="HWL" draggable={false} style={{ height: '55px', width: 'auto', display: 'block' }} />
            </Link>
            <button
              onClick={() => setMenuOpen(true)}
              style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', padding: '8px 0' }}
            >
              menu
            </button>
          </>
        ) : (
          /* ── Desktop ── */
          <>
            {/* Sliding black tab indicator */}
            <div
              ref={indicatorRef}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                height: '100%',
                width: 0,
                backgroundColor: '#000000',
                borderTopRightRadius: DESKTOP.tab.radius,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            {/* Logo — transparent bg, logo inverts to black when tab moves away */}
            <div
              ref={logoTabRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'stretch',
                padding: `0 ${DESKTOP.tab.rightPad} 0 ${DESKTOP.nav.paddingX}`,
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
              }}
            >
              <button onClick={() => handleNavClick('/')} style={{ display: 'flex', alignItems: 'center', lineHeight: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <img
                  src="/hwl_logo.svg"
                  alt="HWL"
                  draggable={false}
                  style={{
                    height: DESKTOP.logo.height,
                    width: 'auto',
                    display: 'block',
                    marginTop: DESKTOP.logo.marginTop,
                    filter: activeIdx !== -1 ? 'invert(1)' : 'none',
                    transition: 'filter 0.3s ease',
                  }}
                />
              </button>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: DESKTOP.links.gap, paddingRight: DESKTOP.nav.paddingX, position: 'relative', zIndex: 1 }}>
              {links.map((item, i) => (
                <div key={item.label} ref={el => { linkContainerRefs.current[i] = el }} style={{ overflow: 'hidden' }}>
                  <div ref={el => { linkInnerRefs.current[i] = el }}>
                    <button
                      onClick={() => handleNavClick(item.href)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'color 0.35s ease' }}
                      className={activeIdx === i ? 'text-[#fff]' : 'text-[#000] hover:text-[#444]'}
                    >
                      <Component
                        lineHeight={0.85}
                        style={{ fontSize: DESKTOP.links.fontSize }}
                        className="font-sans tracking-normal"
                      >
                        {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                      </Component>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </nav>

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} />}

      {/* Navbar-owned wipe overlay — fires synchronously on click */}
      <div
        ref={navOverlayRef}
        style={{
          position: 'fixed', inset: 0,
          background: '#000000',
          zIndex: 9499,
          pointerEvents: 'none',
          clipPath: COLLAPSED,
          willChange: 'clip-path',
        }}
      />
    </>
  )
}
