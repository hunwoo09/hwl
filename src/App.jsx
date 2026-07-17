import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'

// Route-level code splitting: only the Hero (landing) ships in the main
// bundle; every other page loads its chunk on first navigation. The
// crossfade (450ms+) masks the fetch, and the Suspense fallback is null
// against the same black background, so nothing visibly changes.
const JpgPage         = lazy(() => import('./pages/JpgPage'))
const Mp4Page         = lazy(() => import('./pages/Mp4Page'))
const ObjPage         = lazy(() => import('./pages/ObjPage'))
const ArchivePage     = lazy(() => import('./pages/ArchivePage'))
const ArchiveWorkPage = lazy(() => import('./pages/ArchiveWorkPage'))
const WorkPage        = lazy(() => import('./pages/WorkPage'))
const WorksPage       = lazy(() => import('./pages/WorksPage'))
const AboutPage       = lazy(() => import('./pages/AboutPage'))
import { useIsMobile } from './hooks/useIsMobile'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { aboutExitState } from './aboutExitState'

// Routes that fade in/out on navigation (desktop). Others keep their own
// bespoke gsap crossfades (Hero, Work, ArchiveWork) and stay instant here.
const FADE_ROUTES = new Set(['/', '/archive', '/about', '/works', '/jpg', '/mp4', '/obj'])
const FADE_MS = 450
// /about is the only white-bg page — its black<->white swap reads better
// slower than the black<->black/no-op swaps between the other pages.
const FADE_MS_ABOUT = 600

function fadeDurationFor(pathA, pathB) {
  return (pathA === '/about' || pathB === '/about') ? FADE_MS_ABOUT : FADE_MS
}

// Manual crossfade: fades the OLD page out, swaps content, fades the NEW
// page in — only when both sides of the transition are in FADE_ROUTES.
// (Framer Motion's AnimatePresence exit-prop-as-function + custom trick was
// unreliable here since exiting nodes don't reliably pick up live custom
// updates, so this drives it with plain state instead.)
function useCrossfade(location) {
  const [displayLoc, setDisplayLoc] = useState(location)
  const [opacity, setOpacity] = useState(1)
  const [seenPathname, setSeenPathname] = useState(location.pathname)
  const timerRef = useRef(null)

  const duration = fadeDurationFor(displayLoc.pathname, location.pathname)

  // Derived-state adjustment on navigation, done during render (not an
  // effect) per React's own guidance — avoids an extra render round-trip
  // for the non-fading case and can't loop since seenPathname is tracked.
  if (location.pathname !== seenPathname) {
    setSeenPathname(location.pathname)
    const shouldFade = FADE_ROUTES.has(displayLoc.pathname) && FADE_ROUTES.has(location.pathname)
    if (shouldFade) {
      setOpacity(0)
    } else {
      setDisplayLoc(location)
      setOpacity(1)
    }
  }

  // Once faded out, swap content and fade back in.
  useEffect(() => {
    if (opacity !== 0 || displayLoc.pathname === location.pathname) return
    timerRef.current = setTimeout(() => {
      setDisplayLoc(location)
      setOpacity(1)
    }, duration)
    return () => clearTimeout(timerRef.current)
  }, [opacity, location, displayLoc.pathname, duration])

  return { displayLoc, opacity, duration }
}

function RotateLock() {
  return (
    <div style={{
      display: 'none',
      position: 'fixed', inset: 0, zIndex: 99999,
      backgroundColor: '#000000',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
    }}
      className="rotate-lock"
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
        <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
      </svg>
      <p style={{
        fontFamily: '"Sequel Sans Heavy Disp"',
        fontSize: '10px', letterSpacing: '0.35em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
      }}>
        rotate to portrait
      </p>
    </div>
  )
}

function buildRoutes(loc) {
  return (
    <Suspense fallback={null}>
      <Routes location={loc}>
      <Route path="/"        element={<Hero />} />
      <Route path="/jpg"     element={<JpgPage />} />
      <Route path="/mp4"     element={<Mp4Page />} />
      <Route path="/obj"     element={<ObjPage />} />
      <Route path="/works"   element={<WorksPage />} />
      <Route path="/archive" element={<ArchivePage />} />
      <Route path="/work/:slug" element={<WorkPage />} />
      <Route path="/archive/:id" element={<ArchiveWorkPage />} />
      <Route path="/about"   element={<AboutPage />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { displayLoc, opacity, duration } = useCrossfade(location)

  // AboutPage's own useLocation() stays frozen at '/about' while it's
  // fading out (see aboutExitState.js) — notify it here, from the real
  // location, so it can fade its social buttons out in time.
  const prevPathnameRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = location.pathname
    if (prev === '/about' && location.pathname !== '/about') {
      aboutExitState.emitLeaving()
    }
  }, [location])

  // Background must track whatever is actually on screen — on desktop
  // that's the (possibly still-fading) displayLoc, not the just-navigated-to
  // location, otherwise the bg flips before the old page finishes fading out.
  const activeLoc = isMobile ? location : displayLoc
  const isHome  = activeLoc.pathname === '/'
  const isAbout = activeLoc.pathname.startsWith('/about')

  useSmoothScroll(isMobile)

  return (
    <div
      style={{
        transition: `background-color ${FADE_MS_ABOUT}ms ease`,
        ...(isHome
          ? { backgroundColor: '#000000', height: '100vh', overflow: 'hidden' }
          : { backgroundColor: isAbout ? '#ffffff' : '#000000' }),
      }}
    >
      <RotateLock />
      <Navbar />

      {isMobile ? (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            {buildRoutes(location)}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div style={{ opacity, transition: `opacity ${duration}ms ease-in-out` }}>
          {buildRoutes(displayLoc)}
        </div>
      )}
    </div>
  )
}

export default App
