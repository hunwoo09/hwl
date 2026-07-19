import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
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
// Mobile fades every route (see useCrossfade below).
const FADE_ROUTES = new Set(['/', '/archive', '/about', '/works', '/jpg', '/mp4', '/obj'])
const FADE_MS = 450
// /about is the only white-bg page — its black<->white swap reads better
// slower than the black<->black/no-op swaps between the other pages.
const FADE_MS_ABOUT = 600
const FADE_MS_MOBILE = 350

function fadeDurationFor(pathA, pathB, isMobile) {
  if (isMobile) return FADE_MS_MOBILE
  return (pathA === '/about' || pathB === '/about') ? FADE_MS_ABOUT : FADE_MS
}

// pathname -> dynamic import() for that route's chunk. Calling import()
// again on an already-fetched chunk just returns the cached module (no
// re-fetch) so this is cheap to call repeatedly.
const ROUTE_LOADERS = {
  '/jpg':     () => import('./pages/JpgPage'),
  '/mp4':     () => import('./pages/Mp4Page'),
  '/obj':     () => import('./pages/ObjPage'),
  '/archive': () => import('./pages/ArchivePage'),
  '/works':   () => import('./pages/WorksPage'),
  '/about':   () => import('./pages/AboutPage'),
}
function loaderFor(pathname) {
  if (ROUTE_LOADERS[pathname]) return ROUTE_LOADERS[pathname]
  if (pathname.startsWith('/work/'))    return () => import('./pages/WorkPage')
  if (pathname.startsWith('/archive/')) return () => import('./pages/ArchiveWorkPage')
  return null
}
// Cap how long the swap will wait on a cold/slow chunk fetch — a dead
// network shouldn't be able to stall the page forever.
const PRELOAD_TIMEOUT_MS = 2000
function chunkReady(pathname) {
  const loader = loaderFor(pathname)
  if (!loader) return Promise.resolve()
  return Promise.race([
    loader(),
    new Promise(resolve => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
  ])
}

// Manual crossfade: fades the OLD page out, swaps content, fades the NEW
// page in. (Framer Motion's AnimatePresence exit-prop-as-function + custom
// trick was unreliable here since exiting nodes don't reliably pick up live
// custom updates, so this drives it with plain state instead.)
function useCrossfade(location, isMobile) {
  const [displayLoc, setDisplayLoc] = useState(location)
  const [opacity, setOpacity] = useState(1)
  const [seenPathname, setSeenPathname] = useState(location.pathname)

  const duration = fadeDurationFor(displayLoc.pathname, location.pathname, isMobile)

  // Derived-state adjustment on navigation, done during render (not an
  // effect) per React's own guidance — avoids an extra render round-trip
  // for the non-fading case and can't loop since seenPathname is tracked.
  if (location.pathname !== seenPathname) {
    setSeenPathname(location.pathname)
    const shouldFade = isMobile || (FADE_ROUTES.has(displayLoc.pathname) && FADE_ROUTES.has(location.pathname))
    if (shouldFade) {
      setOpacity(0)
    } else {
      setDisplayLoc(location)
      setOpacity(1)
    }
  }

  // Once faded out, swap content and fade back in — but not before the
  // target route's chunk has actually loaded. Without this, the swap fired
  // on a flat timer regardless of load state: on a cold fetch (first-ever
  // visit to a route, or once the browser drops the chunk from memory) the
  // fade-in finished on schedule while Suspense was still rendering its
  // null fallback, so the page popped in abruptly after the fade instead of
  // fading in with it. Racing against the timer (not just awaiting the
  // chunk) keeps the common warm-cache case exactly as fast as before.
  useEffect(() => {
    if (opacity !== 0 || displayLoc.pathname === location.pathname) return
    let cancelled = false
    let timerId
    const timerDone = new Promise(resolve => { timerId = setTimeout(resolve, duration) })
    Promise.all([timerDone, chunkReady(location.pathname)]).then(() => {
      if (cancelled) return
      setDisplayLoc(location)
      setOpacity(1)
    })
    return () => { cancelled = true; clearTimeout(timerId) }
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

// Kicks off the chunk fetches for every lazy route during idle time so the
// crossfade timer (which fires on a fixed clock, not on chunk-ready) never
// races a cold network fetch — that race is what made first-ever navigation
// to a page look laggy/un-faded while every later visit was smooth.
function usePreloadRoutes() {
  useEffect(() => {
    const preload = () => {
      Object.values(ROUTE_LOADERS).forEach(load => load())
      import('./pages/WorkPage')
      import('./pages/ArchiveWorkPage')
    }
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 2000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(preload, 1000)
    return () => clearTimeout(id)
  }, [])
}

function App() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { displayLoc, opacity, duration } = useCrossfade(location, isMobile)
  usePreloadRoutes()

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

  // Background must track whatever is actually on screen — that's the
  // (possibly still-fading) displayLoc, not the just-navigated-to location,
  // otherwise the bg flips before the old page finishes fading out.
  const isHome  = displayLoc.pathname === '/'
  const isAbout = displayLoc.pathname.startsWith('/about')

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

      <div style={{ opacity, transition: `opacity ${duration}ms ease-in-out` }}>
        {buildRoutes(displayLoc)}
      </div>
    </div>
  )
}

export default App
