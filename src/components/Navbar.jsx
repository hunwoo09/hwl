import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'

const links = [
  { label: 'works',   href: '/works' },
  { label: 'archive', href: '/archive' },
  { label: 'about',   href: '/about' },
]

const mono = '"Sequel Sans Heavy Disp"'

// ── Change this one number — everything else scales from it ────────────────
export const NAV_H = 64   // navbar height in px

const DESKTOP = {
  nav:   { height: `${NAV_H}px`,                      paddingX: '40px' },
  logo:  { height: `${Math.round(NAV_H * 0.62)}px`,   marginTop: 4    },
  links: { fontSize: `${Math.round(NAV_H * 0.68)}px`, gap: '40px'      },
  tab:   { radius: `${Math.round(NAV_H * 0.5)}px`,    rightPad: `${Math.round(NAV_H * 1.1)}px` },
}
// ───────────────────────────────────────────────────────────────────────────

let _navIntroPlayed = false

function MobileMenu({ onClose, closing }) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const overlayRef = useRef(null)
  const letterRefs = useRef(links.map(() => []))
  const numRefs    = useRef([])
  const exitingRef = useRef(false)

  const wordSpans = useCallback((i) => letterRefs.current[i].filter(Boolean), [])

  // Entrance: letters rise out of per-letter clip masks, word by word — same
  // treatment as the name on the About page.
  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' }
    )
    links.forEach((_, i) => {
      tl.fromTo(wordSpans(i),
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: 'power3.out', force3D: true },
        0.12 + i * 0.09
      )
    })
    tl.fromTo(numRefs.current.filter(Boolean),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
      0.45
    )
    return () => tl.kill()
  }, [wordSpans])

  // Exit: letters drop back behind their masks (reverse order), then the
  // overlay fades — shared by the close toggle and link navigation.
  const playExit = useCallback((onDone) => {
    const tl = gsap.timeline({ onComplete: onDone })
    links.forEach((_, i) => {
      tl.to(wordSpans(links.length - 1 - i),
        { yPercent: 110, duration: 0.35, ease: 'power2.in', force3D: true },
        i * 0.06
      )
    })
    tl.to(numRefs.current.filter(Boolean), { opacity: 0, duration: 0.25 }, 0)
    tl.to(overlayRef.current, { opacity: 0, duration: 0.3 }, '-=0.15')
    return tl
  }, [wordSpans])

  const handleNav = (href) => {
    if (exitingRef.current) return
    exitingRef.current = true
    playExit(() => { onClose(); navigate(href) })
  }

  // Close is driven from the navbar's menu/close toggle — the `closing` prop
  // flips true and the exit timeline runs before actually unmounting.
  useEffect(() => {
    if (!closing || exitingRef.current) return
    exitingRef.current = true
    const tl = playExit(onClose)
    return () => tl.kill()
  }, [closing, onClose, playExit])

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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.map(({ label, href }, i) => (
          <button
            key={label}
            onClick={() => handleNav(href)}
            style={{
              fontFamily: mono,
              fontSize: 'clamp(2.8rem, 14vw, 5rem)',
              fontStyle: 'normal', fontWeight: 300,
              letterSpacing: '-0.02em', lineHeight: 1.05,
              color: '#ffffff',
              background: 'none', border: 'none',
              textAlign: 'left', padding: '6px 0',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}
          >
            {label.split('').map((ch, j) => (
              <span key={j} style={{ display: 'inline-block', overflow: 'hidden' }}>
                <span
                  ref={el => { letterRefs.current[i][j] = el }}
                  style={{ display: 'inline-block', transform: 'translateY(110%)' }}
                >
                  {ch}
                </span>
              </span>
            ))}
          </button>
        ))}
      </nav>

      <div style={{
        position: 'absolute', bottom: 40, left: 36,
        display: 'flex', gap: '24px',
      }}>
        {links.map(({ label, href }, i) => (
          <span
            key={label}
            ref={el => { numRefs.current[i] = el }}
            style={{
              fontFamily: mono, fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase',
              // Echo of the desktop tab indicator: the current section's index lights up
              color: location.pathname.startsWith(href) ? '#ffffff' : '#333',
              opacity: 0,
            }}
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
  const logoImgRef        = useRef(null)
  const linkContainerRefs = useRef([])
  const letterRefs        = useRef([])   // row 1 — entrance + hover out
  const letter2Refs       = useRef([])   // row 2 — hover in (starts below)
  const mountedRef        = useRef(false)
  const isMobile          = useIsMobile()
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const location = useLocation()

  const activeIdx = links.findIndex(l => location.pathname.startsWith(l.href))
  const activeIdxRef = useRef(activeIdx)
  useEffect(() => { activeIdxRef.current = activeIdx })
  const isAboutActive = activeIdx !== -1 && links[activeIdx].href === '/about'

  const handleLinkEnter = (i) => {
    const r1 = (letterRefs.current[i]  || []).filter(Boolean)
    const r2 = (letter2Refs.current[i] || []).filter(Boolean)
    gsap.killTweensOf([...r1, ...r2])
    gsap.to(r1, { yPercent: -100, duration: 0.38, stagger: 0.028, ease: 'power2.in'  })
    gsap.to(r2, { yPercent:    0, duration: 0.38, stagger: 0.028, ease: 'power2.in'  })
  }

  const handleLinkLeave = (i) => {
    const r1 = (letterRefs.current[i]  || []).filter(Boolean)
    const r2 = (letter2Refs.current[i] || []).filter(Boolean)
    gsap.killTweensOf([...r1, ...r2])
    gsap.to(r1, { yPercent:   0, duration: 0.42, stagger: 0.028, ease: 'power3.out' })
    gsap.to(r2, { yPercent: 100, duration: 0.42, stagger: 0.028, ease: 'power3.out' })
  }

  const positionIndicator = (animate) => {
    const idx = activeIdxRef.current
    const ind = indicatorRef.current
    const nav = navRef.current
    if (!ind || !nav) return
    const navRect = nav.getBoundingClientRect()

    let el, extraPad
    if (idx === -1) {
      el       = logoTabRef.current
      extraPad = 0
    } else {
      el       = linkContainerRefs.current[idx]
      extraPad = 20
    }
    if (!el) return

    const r = el.getBoundingClientRect()
    const aboutActive = idx !== -1 && links[idx].href === '/about'
    const props = {
      x:              r.left - navRect.left - extraPad,
      width:          r.width + extraPad * 2,
      backgroundColor: aboutActive ? '#ffffff' : '#000000',
    }

    if (animate) {
      gsap.to(ind, { ...props, duration: 0.7, ease: 'power3.inOut' })
    } else {
      gsap.set(ind, props)
    }
  }

  useEffect(() => {
    // Place row-2 letters below their clip area (ready for hover)
    letter2Refs.current.forEach(wordRefs => {
      const spans = (wordRefs || []).filter(Boolean)
      if (spans.length) gsap.set(spans, { yPercent: 100 })
    })

    positionIndicator(false)
    mountedRef.current = true

    // Logo/link widths are measured against the fallback font until "Sequel
    // Sans Heavy Disp" finishes loading — re-snap once it's actually ready so
    // the tab doesn't visibly jump on first paint.
    document.fonts?.ready?.then(() => positionIndicator(false))

    const onVisibility = () => {
      if (document.visibilityState === 'visible') positionIndicator(false)
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onResize = () => positionIndicator(false)
    window.addEventListener('resize', onResize)

    // Already animated on a previous mount (StrictMode double-invoke safety)
    if (_navIntroPlayed) {
      gsap.set(navRef.current, { opacity: 1 })
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('resize', onResize)
      }
    }

    const runAnimation = () => {
      if (_navIntroPlayed) return
      _navIntroPlayed = true

      // Logo starts invisible — fades in separately
      gsap.set(logoImgRef.current, { opacity: 0 })
      gsap.set(navRef.current, { opacity: 1 })

      // 1. White bar grows downward (clipPath — children not scaled, just clipped)
      gsap.fromTo(navRef.current,
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' },
        {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 0.75, ease: 'expo.out',
          onComplete: () => {
            gsap.set(navRef.current, { clipPath: 'none' })
            positionIndicator(false)
          },
        }
      )

      // 2. Logo fades in only (not affected by the bar growth)
      gsap.to(logoImgRef.current, { opacity: 1, duration: 0.7, ease: 'power2.out', delay: 0.25 })

      // 3. Letter-by-letter reveal for each link word
      letterRefs.current.forEach((wordLetters, wi) => {
        const letters = (wordLetters || []).filter(Boolean)
        if (!letters.length) return
        gsap.fromTo(letters,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.65, stagger: 0.055, ease: 'expo.out', delay: 0.2 + wi * 0.1 }
        )
      })
    }

    // On home page: sync with Hero's intro-complete event
    // On other pages: animate after a short delay
    const isHome = window.location.pathname === '/'

    if (isHome) {
      let fallback
      const handler = () => {
        clearTimeout(fallback)
        window.removeEventListener('nav-intro-ready', handler)
        runAnimation()
      }
      window.addEventListener('nav-intro-ready', handler)
      fallback = setTimeout(runAnimation, 6000)
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('resize', onResize)
        window.removeEventListener('nav-intro-ready', handler)
        clearTimeout(fallback)
      }
    } else {
      const t = setTimeout(runAnimation, 350)
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('resize', onResize)
        clearTimeout(t)
      }
    }
  }, [])

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
          backgroundColor: isMobile ? '#000000' : (isAboutActive ? '#000000' : '#ffffff'),
          transition:      isMobile ? 'none' : 'background-color 0.4s ease',
          borderBottom:    isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
          height: isMobile ? 'calc(52px + env(safe-area-inset-top, 0px))' : DESKTOP.nav.height,
          ...(isMobile ? { paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '0' } : {}),
        }}
      >
        {isMobile ? (
          /* ── Mobile ── */
          <>
            <Link to="/" style={{ display: 'block', lineHeight: 0, flexShrink: 0 }}>
              <img src="/hwl_logo.svg" alt="HWL" draggable={false} style={{ height: '32px', width: 'auto', display: 'block' }} />
            </Link>
            <button
              onClick={() => {
                if (!menuOpen) { setMenuClosing(false); setMenuOpen(true) }
                else if (!menuClosing) setMenuClosing(true)
              }}
              style={{
                fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase',
                color: '#ffffff',
                background: 'none', border: 'none',
                // 44px minimum hit area (visual size unchanged) — the negative
                // margin swallows the extra padding so layout doesn't shift.
                minHeight: 44, minWidth: 44, padding: '8px 0 8px 16px', margin: '-8px 0',
                // Navbar sits above the menu overlay (9600 vs 9000), so this
                // button stays tappable while the menu is open.
                position: 'relative', zIndex: 2,
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              }}
            >
              {/* Both labels stacked in one grid cell — the swap crossfades
                  instead of snapping, and the button never changes width */}
              <span style={{ display: 'inline-grid', justifyItems: 'end' }}>
                <span style={{ gridArea: '1 / 1', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.28s ease' }}>menu</span>
                <span style={{ gridArea: '1 / 1', opacity: menuOpen ? 1 : 0, transition: 'opacity 0.28s ease' }} aria-hidden={!menuOpen}>close</span>
              </span>
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

            {/* Logo */}
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
              <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }}>
                <img
                  ref={logoImgRef}
                  src="/hwl_logo.svg"
                  alt="HWL"
                  draggable={false}
                  style={{
                    height: DESKTOP.logo.height,
                    width: 'auto',
                    display: 'block',
                    marginTop: DESKTOP.logo.marginTop,
                    filter: (activeIdx !== -1 && !isAboutActive) ? 'invert(1)' : 'none',
                    transition: 'filter 0.3s ease',
                  }}
                />
              </Link>
            </div>

            {/* Links — letters in individual overflow-hidden clips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: DESKTOP.links.gap, paddingRight: DESKTOP.nav.paddingX, position: 'relative', zIndex: 1 }}>
              {links.map((item, i) => {
                const label = item.label.charAt(0).toUpperCase() + item.label.slice(1)
                return (
                  <div key={item.label} ref={el => { linkContainerRefs.current[i] = el }}>
                    <Link
                      to={item.href}
                      onMouseEnter={() => handleLinkEnter(i)}
                      onMouseLeave={() => handleLinkLeave(i)}
                      style={{
                        display: 'flex', alignItems: 'baseline',
                        color: isAboutActive
                          ? (activeIdx === i ? '#000' : '#fff')
                          : (activeIdx === i ? '#fff' : '#000'),
                        transition: 'color 0.4s ease',
                      }}
                    >
                      {label.split('').map((char, j) => (
                        <span
                          key={j}
                          style={{ display: 'inline-block', overflow: 'hidden', lineHeight: 0.85, position: 'relative' }}
                        >
                          {/* Row 1 — visible, animates out upward on hover */}
                          <span
                            ref={el => {
                              if (!letterRefs.current[i]) letterRefs.current[i] = []
                              letterRefs.current[i][j] = el
                            }}
                            style={{ display: 'block', fontFamily: mono, fontSize: DESKTOP.links.fontSize }}
                          >
                            {char}
                          </span>
                          {/* Row 2 — starts below clip, animates in on hover */}
                          <span
                            ref={el => {
                              if (!letter2Refs.current[i]) letter2Refs.current[i] = []
                              letter2Refs.current[i][j] = el
                            }}
                            style={{ display: 'block', position: 'absolute', top: 0, left: 0, fontFamily: mono, fontSize: DESKTOP.links.fontSize }}
                            aria-hidden="true"
                          >
                            {char}
                          </span>
                        </span>
                      ))}
                    </Link>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </nav>

      {menuOpen && (
        <MobileMenu
          closing={menuClosing}
          onClose={() => { setMenuOpen(false); setMenuClosing(false) }}
        />
      )}
    </>
  )
}
