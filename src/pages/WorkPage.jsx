import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { transitionState } from '../transitionState'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import TheaterView from '../components/TheaterView'
import WorkLoading from '../components/WorkLoading'
import { useIsMobile } from '../hooks/useIsMobile'
import { NAV_H } from '../components/Navbar'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

function fileUrl(ref) {
  return `https://cdn.sanity.io/files/18oh8tdj/production/${ref
    .replace('file-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

const noCtx        = (e) => e.preventDefault()
const LEFT_W       = 420
const ITEM_FR      = 0.78
const ITEM_FR_ARC  = 0.78   // archive gallery slide width (fraction of viewport)
const LERP         = 0.075
const SNAP_MS      = 200

// Individual work page gallery: dots sit at bottom:32 with a 4px height, so
// this padding-top makes the gap navbar→image equal the gap image→dots,
// no matter how tall any given image renders (see WorkPage.jsx gallery panel).
const DOTS_BOTTOM      = 32
const DOTS_H           = 4
const GALLERY_TOP_PAD  = NAV_H - DOTS_BOTTOM - DOTS_H

const mono = '"Sequel Sans Heavy Disp"'

export default function WorkPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  const location = useLocation()
  const [project, setProject] = useState(location.state?.project ?? null)
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [loadingDone,   setLoadingDone]   = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [scrubbing,     setScrubbing]     = useState(false)
  const [showLine,      setShowLine]      = useState(false)
  const [mobilePlaying, setMobilePlaying] = useState(false)

  const pageRef      = useRef(null)
  const leftRef      = useRef(null)
  const panelRef     = useRef(null)
  const trackRef     = useRef(null)
  const idxRef       = useRef(0)
  const countRef     = useRef(0)
  const videoRefs    = useRef([])
  const scrubbingRef = useRef(false)

  const exitingRef     = useRef(false)
  const readyToExitRef = useRef(false)
  const targetX    = useRef(0)
  const currentX   = useRef(0)
  const prevX      = useRef(0)
  const lastScroll = useRef(0)
  const itemFrRef  = useRef(ITEM_FR)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    // If we already have data from navigation state, skip the fetch
    if (project?._id === id) return
    client.fetch(`*[_type == "project" && _id == $id][0]`, { id }).then(setProject)
  }, [id])

  useEffect(() => {
    if (!project || !leftRef.current) return
    gsap.set(leftRef.current, { opacity: 1 })
    const kids = Array.from(leftRef.current.children)
    gsap.fromTo(kids,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09 }
    )
  }, [project, loadingDone])

  useLayoutEffect(() => {
    if (!project || !panelRef.current) return
    const panelW = panelRef.current.clientWidth
    const itemW  = panelW * itemFrRef.current
    const initX  = (panelW - itemW) / 2
    targetX.current  = initX
    currentX.current = initX
    prevX.current    = initX
    idxRef.current   = 0
    setActiveIndex(0)
    if (trackRef.current) gsap.set(trackRef.current, { x: initX })
  }, [project, loadingDone])

  // ── Fade in on arrival from the list view ─────────────────────────────────
  useEffect(() => {
    if (!project || !pageRef.current || !location.state?.fromList) return
    gsap.to(pageRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' })
  }, [project, loadingDone]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (exitingRef.current) return
    exitingRef.current = true
    if (location.state?.fromList) transitionState.returnedFromList = true
    if (location.state?.fromList && pageRef.current) {
      gsap.to(pageRef.current, { opacity: 0, duration: 0.4, ease: 'power2.in', onComplete: () => navigate(-1) })
    } else {
      navigate(-1)
    }
  }, [navigate, location.state])

  const handleBackRef = useRef(handleBack)
  useEffect(() => { handleBackRef.current = handleBack }, [handleBack])

  const snapNearest = useCallback(() => {
    const panel = panelRef.current
    if (!panel || !countRef.current) return
    const panelW  = panel.clientWidth
    const itemW   = panelW * itemFrRef.current
    const k       = Math.round(((panelW - itemW) / 2 - currentX.current) / itemW)
    const clamped = Math.max(0, Math.min(k, countRef.current - 1))
    targetX.current = (panelW - itemW) / 2 - clamped * itemW
    if (clamped !== idxRef.current) {
      idxRef.current = clamped
      setActiveIndex(clamped)
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || !project) return
    let raf, snapped = false

    const tick = () => {
      currentX.current += (targetX.current - currentX.current) * LERP
      const vel = currentX.current - prevX.current
      prevX.current = currentX.current

      const idle = Date.now() - lastScroll.current > SNAP_MS
      if (idle && Math.abs(vel) < 0.4 && !snapped) {
        snapped = true
        snapNearest()
        if (idxRef.current === 0) readyToExitRef.current = true
      } else if (!idle) snapped = false

      const panel = panelRef.current
      if (panel && countRef.current > 0) {
        const panelW  = panel.clientWidth
        const itemW   = panelW * itemFrRef.current
        const k       = Math.round(((panelW - itemW) / 2 - currentX.current) / itemW)
        const clamped = Math.max(0, Math.min(k, countRef.current - 1))
        if (clamped !== idxRef.current) {
          idxRef.current = clamped
          setActiveIndex(clamped)
        }
      }

      gsap.set(track, { x: Math.round(currentX.current) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [project, loadingDone, snapNearest])

  const clampTarget = useCallback(() => {
    const panel = panelRef.current
    if (!panel || !countRef.current) return
    const panelW = panel.clientWidth
    const itemW  = panelW * itemFrRef.current
    const maxX   = (panelW - itemW) / 2
    const minX   = maxX - (countRef.current - 1) * itemW
    targetX.current = Math.max(minX, Math.min(maxX, targetX.current))
  }, [])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !project) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      readyToExitRef.current = false
      targetX.current   -= delta * 0.85
      clampTarget()
      lastScroll.current = Date.now()
    }
    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => panel.removeEventListener('wheel', onWheel)
  }, [project, loadingDone, clampTarget])

  useEffect(() => {
    if (isMobile) return
    const onWheel = (e) => {
      if (leftRef.current?.contains(e.target)) return
      if (idxRef.current === 0 && readyToExitRef.current &&
          e.deltaY < -10 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        handleBackRef.current()
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true, capture: true })
    return () => window.removeEventListener('wheel', onWheel, { capture: true })
  }, [isMobile])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !project) return
    let startX = 0, startY = 0, startTX = 0, isH = null
    const onStart = (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY
      startTX = targetX.current; isH = null
    }
    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (isH === null) isH = Math.abs(dx) > Math.abs(dy)
      if (isH) {
        e.preventDefault()
        targetX.current = startTX + dx * 1.4
        clampTarget()
        lastScroll.current = Date.now()
      }
    }
    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove',  onMove,  { passive: false })
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove',  onMove)
    }
  }, [project, loadingDone, clampTarget])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !project) return
    let dragging = false, startX = 0, startTX = 0
    const onDown = (e) => { dragging = true; startX = e.clientX; startTX = targetX.current; lastScroll.current = Date.now() }
    const onMove = (e) => { if (!dragging) return; targetX.current = startTX + (e.clientX - startX); clampTarget(); lastScroll.current = Date.now() }
    const onUp   = () => { dragging = false }
    panel.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      panel.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [project, loadingDone, clampTarget])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const ro = new ResizeObserver(() => {
      const panelW = panel.clientWidth
      const itemW  = panelW * itemFrRef.current
      const snap   = (panelW - itemW) / 2 - idxRef.current * itemW
      targetX.current  = snap
      currentX.current = snap
      if (trackRef.current) gsap.set(trackRef.current, { x: snap })
    })
    ro.observe(panel)
    return () => ro.disconnect()
  }, [loadingDone])

  // ── Video scrubber ─────────────────────────────────────────────────────────

  useEffect(() => { scrubbingRef.current = scrubbing }, [scrubbing])

  // Auto-play active video, pause others
  useEffect(() => {
    setMobilePlaying(false)
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === activeIndex) {
        v.play?.().then(() => setMobilePlaying(true)).catch(() => setMobilePlaying(false))
      } else { v.pause(); v.currentTime = 0 }
    })
    setVideoProgress(0)
  }, [activeIndex])

  const onVideoPointerDown = useCallback((e, videoEl) => {
    if (!videoEl) return
    e.preventDefault()
    e.stopPropagation()
    const seek = (clientX, clientY) => {
      const rect    = videoEl.getBoundingClientRect()
      const pct     = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const clampedX = rect.left + pct * rect.width
      setVideoProgress(pct)
      if (videoEl.duration) videoEl.currentTime = pct * videoEl.duration
      const dot = document.getElementById('cursor')
      if (dot) { dot.style.left = clampedX + 'px'; dot.style.top = clientY + 'px' }
    }
    setScrubbing(true)
    seek(e.clientX, e.clientY)
    const onMove = (ev) => seek(ev.clientX, ev.clientY)
    const onUp   = () => {
      setScrubbing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }, [])

  const goTo = useCallback((idx) => {
    const panel = panelRef.current
    if (!panel) return
    const panelW = panel.clientWidth
    const itemW  = panelW * itemFrRef.current
    targetX.current    = (panelW - itemW) / 2 - idx * itemW
    lastScroll.current = Date.now()
  }, [])

  const toggleMobileVideo = useCallback((i) => {
    const v = videoRefs.current[i]
    if (!v) return
    if (v.paused) { v.play().then(() => setMobilePlaying(true)).catch(() => {}) }
    else { v.pause(); setMobilePlaying(false) }
  }, [])

  const mobileFullscreenVideo = useCallback((v) => {
    if (!v) return
    if (v.webkitEnterFullscreen) v.webkitEnterFullscreen()
    else if (v.requestFullscreen) v.requestFullscreen()
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!project) return <div style={{ position: 'fixed', inset: 0, background: '#000000' }} />

  const cat       = (project.category || '').replace('.', '').toLowerCase()
  const isArchive = cat === 'archive'
  itemFrRef.current = isArchive ? ITEM_FR_ARC : ITEM_FR
  const glbRef    = project.glbFile?.asset?._ref
  const glbUrl = glbRef ? fileUrl(glbRef) : null

  if (cat === 'mp4' && project.videos?.some(v => v?.asset?._ref)) {
    return <TheaterView project={project} />
  }

  if (cat === 'obj' && glbRef && !loadingDone) {
    return <WorkLoading glbUrl={glbUrl} onComplete={() => setLoadingDone(true)} />
  }

  const year     = project.year
  const metaRest = [project.medium, project.location].filter(Boolean)

  const mediaItems = [
    ...(project.videoFile?.asset?._ref
      ? [{ type: 'video', data: { asset: project.videoFile.asset } }] : []),
    ...(project.videos  || []).map(v   => ({ type: 'video', data: v })),
    ...(() => {
      const ref = project.coverImage?.asset?._ref ?? project.coverImage?.assetRef
      return ref ? [{ type: 'image', data: { asset: { _ref: ref } } }] : []
    })(),
    ...(project.images  || []).map(img => ({ type: 'image', data: img })),
  ]
  countRef.current = mediaItems.length

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    const STRIP_H    = 152
    const NAV_H      = 'calc(52px + env(safe-area-inset-top, 0px))'
    const activeItem = mediaItems[activeIndex]

    return (
      <div
        ref={pageRef}
        style={{ backgroundColor: '#000', minHeight: '100dvh', paddingBottom: STRIP_H + 24 + 'px', opacity: location.state?.fromList ? 0 : 1 }}
      >
        <style>{`@keyframes mfade{from{opacity:0}to{opacity:1}}`}</style>

        {/* Back — floats just below nav, over the hero image */}
        <button
          onClick={handleBack}
          style={{
            position: 'fixed',
            top: `calc(${NAV_H} + 10px)`,
            left: 20, zIndex: 25,
            fontFamily: mono, fontSize: '10px', letterSpacing: '0.35em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
            background: 'none', border: 'none', padding: '6px 0',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}
        >
          ← back
        </button>

        {/* ── Hero: full-width crisp preview of active item ── */}
        <div style={{
          marginTop: NAV_H,
          width: '100%', height: '50vh',
          position: 'relative', overflow: 'hidden', backgroundColor: '#000',
        }}>

          {activeItem?.type === 'image' && activeItem?.data?.asset?._ref && (
            <>
              {/* Ambient blurred fill so letterbox areas aren't bare black */}
              <img
                src={imageUrl(activeItem.data.asset._ref)}
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(28px) brightness(0.18)',
                  transform: 'scale(1.14)',
                  userSelect: 'none',
                }}
              />
              {/* Crisp foreground — crossfades on every index change */}
              <img
                key={activeIndex}
                src={imageUrl(activeItem.data.asset._ref)}
                alt={project.title}
                onContextMenu={noCtx} draggable={false}
                style={{
                  position: 'relative', zIndex: 1,
                  width: '100%', height: '100%',
                  objectFit: 'contain', display: 'block',
                  animation: 'mfade 0.38s ease',
                  userSelect: 'none',
                }}
              />
            </>
          )}

          {activeItem?.type === 'video' && activeItem?.data?.asset?._ref && (
            <>
              <video
                key={activeIndex}
                ref={el => { videoRefs.current[activeIndex] = el }}
                src={fileUrl(activeItem.data.asset._ref)}
                muted loop playsInline preload="auto"
                disablePictureInPicture disableRemotePlayback
                controlsList="nodownload nofullscreen noremoteplayback"
                onContextMenu={noCtx}
                onTimeUpdate={e => {
                  const v = e.target
                  setVideoProgress(v.duration ? v.currentTime / v.duration : 0)
                }}
                style={{
                  position: 'relative', zIndex: 1,
                  width: '100%', height: '100%',
                  objectFit: 'contain', display: 'block',
                  animation: 'mfade 0.38s ease',
                }}
              />
              {/* Fullscreen button */}
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => mobileFullscreenVideo(videoRefs.current[activeIndex])}
                style={{
                  position: 'absolute', bottom: 16, right: 16, zIndex: 3,
                  width: 32, height: 32, borderRadius: 4,
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                </svg>
              </button>
            </>
          )}

          {/* Gradient vignette — bottom bleeds into page bg */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, zIndex: 2,
            background: 'linear-gradient(to bottom, transparent, #000)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Info ── */}
        <div ref={leftRef} style={{ padding: '20px 24px 20px', opacity: 0 }}>
          <h1 style={{
            fontFamily: mono, fontSize: 'clamp(1.5rem, 6vw, 2.2rem)',
            fontStyle: 'normal', fontWeight: 300, letterSpacing: '-0.01em',
            color: '#ffffff', lineHeight: 1.1, marginBottom: '12px',
          }}>
            {project.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {year && (
              <span style={{ fontFamily: mono, fontSize: '1.5rem', fontWeight: 300, letterSpacing: '-0.01em', color: '#ffffff' }}>
                {year}
              </span>
            )}
            {metaRest.map((m, i) => (
              <span key={i} style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#555' }}>
                {m}
              </span>
            ))}
          </div>

          {project.description && (
            <p style={{
              fontFamily: mono, fontSize: '12px', fontWeight: 300,
              lineHeight: 1.9, color: '#666',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {project.description}
            </p>
          )}

          {project.codeFiles?.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#333', marginBottom: '10px' }}>Files</p>
              {project.codeFiles.map((f, i) =>
                f?.asset?._ref ? (
                  <a key={i} href={fileUrl(f.asset._ref)} download target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', textDecoration: 'none', fontFamily: mono, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}
                  >
                    <span style={{ color: '#333' }}>↓</span>
                    {f.label || `File ${i + 1}`}
                  </a>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* ── Bottom filmstrip (fixed) ── */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: STRIP_H + 'px',
          backgroundColor: 'rgba(0,0,0,0.97)',
          borderTop: '1px solid #111',
          zIndex: 20,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box',
        }}>

          {/* Dots */}
          {mediaItems.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingTop: 10, paddingBottom: 4 }}>
              {mediaItems.map((_, i) => (
                <div
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    width: i === activeIndex ? 18 : 4, height: 4, borderRadius: 2,
                    backgroundColor: i === activeIndex ? '#ffffff' : '#222',
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}

          {/* Swipeable filmstrip — same engine as before, now in the strip */}
          <div
            ref={panelRef}
            style={{
              height: mediaItems.length > 1 ? STRIP_H - 28 + 'px' : STRIP_H + 'px',
              overflow: 'hidden',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)',
              maskImage:        'linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)',
            }}
          >
            <div ref={trackRef} style={{ display: 'flex', height: '100%', alignItems: 'center', willChange: 'transform' }}>
              {mediaItems.map((item, i) => {
                const act = i === activeIndex
                return (
                  <div
                    key={i}
                    style={{
                      flexShrink: 0, width: `${ITEM_FR * 100}%`, height: '100%',
                      padding: '5px 8px', boxSizing: 'border-box',
                      overflow: 'visible',
                      transition: 'filter 0.45s ease, opacity 0.45s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)',
                      filter:    act ? 'none' : 'blur(2px) brightness(0.28)',
                      opacity:   act ? 1 : 0.35,
                      transform: act ? 'scale(1)' : 'scale(0.84)',
                      pointerEvents: act ? 'auto' : 'none',
                    }}
                  >
                    {item.type === 'image' && item.data?.asset?._ref && (
                      <img
                        src={imageUrl(item.data.asset._ref)}
                        alt={`${project.title} ${i + 1}`}
                        onContextMenu={noCtx} draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none' }}
                      />
                    )}
                    {item.type === 'video' && item.data?.asset?._ref && (
                      <video
                        src={fileUrl(item.data.asset._ref)}
                        muted playsInline preload="metadata"
                        disablePictureInPicture
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    )
  }

  // ── Archive desktop layout: full-screen gallery + top overlay ───────────
  if (isArchive) {
    return (
      <div
        ref={pageRef}
        style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', opacity: location.state?.fromList ? 0 : 1 }}
      >
        {/* ── Top bar: back left · title center ── */}
        <div
          ref={leftRef}
          style={{
            position: 'absolute', top: 60, left: 0, right: 0,
            height: 72, display: 'flex', alignItems: 'center',
            padding: '0 40px', zIndex: 60, opacity: 0,
          }}
        >
          <button
            onClick={handleBack}
            className="font-sans text-[#888] text-[10px] tracking-[0.35em] uppercase hover:text-[#ffffff] transition-colors duration-200"
            style={{ minWidth: 80, textAlign: 'left' }}
          >
            ← back
          </button>
          <h1
            className="font-serif text-[#ffffff] font-light leading-none tracking-tight"
            style={{ flex: 1, textAlign: 'center', fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}
          >
            {project.title}
          </h1>
          <div style={{ minWidth: 80 }} />
        </div>

        {/* ── Full-screen gallery ── */}
        <div
          ref={panelRef}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', cursor: 'default' }}
        >
          {/* ← → chevron arrows */}
          {mediaItems.length > 1 && (<>
            <button
              onClick={() => goTo(activeIndex - 1)}
              style={{
                position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
                zIndex: 10, background: 'none', border: 'none', padding: '12px',
                cursor: 'pointer', color: '#ffffff',
                opacity: activeIndex === 0 ? 0 : 0.55,
                pointerEvents: activeIndex === 0 ? 'none' : 'auto',
                transition: 'opacity 0.25s ease',
              }}
              onMouseEnter={e => { if (activeIndex !== 0) e.currentTarget.style.opacity = 1 }}
              onMouseLeave={e => { if (activeIndex !== 0) e.currentTarget.style.opacity = 0.55 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              style={{
                position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                zIndex: 10, background: 'none', border: 'none', padding: '12px',
                cursor: 'pointer', color: '#ffffff',
                opacity: activeIndex === mediaItems.length - 1 ? 0 : 0.55,
                pointerEvents: activeIndex === mediaItems.length - 1 ? 'none' : 'auto',
                transition: 'opacity 0.25s ease',
              }}
              onMouseEnter={e => { if (activeIndex !== mediaItems.length - 1) e.currentTarget.style.opacity = 1 }}
              onMouseLeave={e => { if (activeIndex !== mediaItems.length - 1) e.currentTarget.style.opacity = 0.55 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </>)}

          {mediaItems.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 32, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', gap: 6, zIndex: 2,
            }}>
              {mediaItems.map((_, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const panel = panelRef.current
                    if (!panel) return
                    const panelW = panel.clientWidth
                    const itemW  = panelW * ITEM_FR_ARC
                    targetX.current    = (panelW - itemW) / 2 - i * itemW
                    lastScroll.current = Date.now()
                  }}
                  style={{
                    width: i === activeIndex ? 16 : 4,
                    height: 4, borderRadius: 2,
                    backgroundColor: i === activeIndex ? '#ffffff' : '#333',
                    transition: 'all 0.3s ease', cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}

          <div ref={trackRef} style={{ display: 'flex', height: '100%', alignItems: 'center', willChange: 'transform' }}>
            {mediaItems.map((item, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: `${ITEM_FR_ARC * 100}%`,
                  height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '72px 24px 0',
                  overflow: 'visible',
                  transition: 'filter 0.55s ease, opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                  filter:    i === activeIndex ? 'none'         : 'blur(6px) brightness(0.62)',
                  opacity:   i === activeIndex ? 1              : 0.55,
                  transform: i === activeIndex ? 'scale(1)'     : 'scale(0.94)',
                  pointerEvents: i === activeIndex ? 'auto' : 'none',
                }}
              >
                {item.type === 'video' ? (
                  <div
                    style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
                    onMouseEnter={() => setShowLine(true)}
                    onMouseLeave={() => setShowLine(false)}
                  >
                    <video
                      ref={el => { videoRefs.current[i] = el }}
                      src={fileUrl(item.data.asset._ref)}
                      muted loop playsInline
                      disablePictureInPicture disableRemotePlayback
                      controlsList="nodownload nofullscreen noremoteplayback"
                      onContextMenu={noCtx}
                      onTimeUpdate={e => {
                        if (i !== activeIndex || scrubbingRef.current) return
                        const v = e.target
                        setVideoProgress(v.duration ? v.currentTime / v.duration : 0)
                      }}
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
                    />
                    {i === activeIndex && (
                      <>
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${videoProgress * 100}%`, width: 1,
                          background: 'rgba(255,255,255,0.85)',
                          boxShadow: '0 0 6px rgba(255,255,255,0.35)',
                          pointerEvents: 'none',
                          opacity: showLine || scrubbing ? 1 : 0,
                          transition: scrubbing ? 'left 0s, opacity 0.3s ease' : 'left 0.08s linear, opacity 0.3s ease',
                        }} />
                        <div style={{
                          position: 'absolute', top: -3,
                          left: `${videoProgress * 100}%`,
                          transform: 'translateX(-50%)',
                          width: 7, height: 7, borderRadius: '50%',
                          background: '#fff', pointerEvents: 'none',
                          opacity: showLine || scrubbing ? 1 : 0,
                          transition: scrubbing ? 'left 0s, opacity 0.3s ease' : 'left 0.08s linear, opacity 0.3s ease',
                        }} />
                        <div
                          onPointerDown={e => onVideoPointerDown(e, videoRefs.current[i])}
                          style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 2 }}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  item.data?.asset?._ref && (
                    <img
                      src={imageUrl(item.data.asset._ref)}
                      alt={`${project.title} ${i + 1}`}
                      onContextMenu={noCtx} draggable={false}
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '70vh', display: 'block', userSelect: 'none' }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  return (
    <div
      ref={pageRef}
      style={{ position: 'fixed', inset: 0, display: 'flex', backgroundColor: '#000000', opacity: location.state?.fromList ? 0 : 1 }}
    >

      {/* ── Info panel ── */}
      <div
        ref={leftRef}
        className="no-scrollbar"
        style={{
          width: LEFT_W, height: '100vh',
          borderRight: '1px solid #222',
          display: 'flex', flexDirection: 'column',
          padding: '130px 32px 48px',
          backgroundColor: '#000000',
          overflowY: 'auto', flexShrink: 0,
          opacity: 0, zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={handleBack}
            className="font-sans text-[#444] text-[10px] tracking-[0.35em] uppercase hover:text-[#ffffff] transition-colors duration-200 mb-10 block text-left"
          >
            ← back
          </button>

          <h1
            className="font-serif text-[#ffffff] font-light leading-[0.95] tracking-tight mb-5"
            style={{ fontSize: 'clamp(2rem, 3vw, 3rem)' }}
          >
            {project.title}
          </h1>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-8">
            {year && (
              <span className="font-sans text-[#ffffff] font-light" style={{ fontSize: '1.75rem', letterSpacing: '-0.01em' }}>
                {year}
              </span>
            )}
            {metaRest.map((item, i) => (
              <span key={i} className="font-sans text-[#444] text-[11px] tracking-[0.25em] uppercase">
                {item}
              </span>
            ))}
          </div>

          {project.description && (
            <p
              className="font-serif text-[#666] text-sm font-light leading-relaxed"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {project.description}
            </p>
          )}
        </div>

        {project.codeFiles?.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <p className="font-sans text-[#333] text-[10px] tracking-[0.4em] uppercase mb-2">Files</p>
            {project.codeFiles.map((f, i) =>
              f?.asset?._ref ? (
                <a key={i} href={fileUrl(f.asset._ref)} download target="_blank" rel="noopener noreferrer"
                  className="font-sans text-[#555] text-[10px] tracking-[0.2em] uppercase hover:text-[#ffffff] transition-colors duration-200 flex items-center gap-2 mt-2"
                >
                  <span className="text-[#333]">↓</span>
                  {f.label || `File ${i + 1}`}
                </a>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* ── Gallery ── */}
      <div
        ref={panelRef}
        style={{
          flex: 1, height: '100vh', boxSizing: 'border-box',
          paddingTop: GALLERY_TOP_PAD,
          overflow: 'hidden', position: 'relative', cursor: 'default',
        }}
      >
        {/* ← → chevron arrows */}
        {mediaItems.length > 1 && (<>
          <button
            onClick={() => goTo(activeIndex - 1)}
            style={{
              position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, background: 'none', border: 'none', padding: '12px',
              cursor: 'pointer', color: '#ffffff',
              opacity: activeIndex === 0 ? 0 : 0.55,
              pointerEvents: activeIndex === 0 ? 'none' : 'auto',
              transition: 'opacity 0.25s ease',
            }}
            onMouseEnter={e => { if (activeIndex !== 0) e.currentTarget.style.opacity = 1 }}
            onMouseLeave={e => { if (activeIndex !== 0) e.currentTarget.style.opacity = 0.55 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            onClick={() => goTo(activeIndex + 1)}
            style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, background: 'none', border: 'none', padding: '12px',
              cursor: 'pointer', color: '#ffffff',
              opacity: activeIndex === mediaItems.length - 1 ? 0 : 0.55,
              pointerEvents: activeIndex === mediaItems.length - 1 ? 'none' : 'auto',
              transition: 'opacity 0.25s ease',
            }}
            onMouseEnter={e => { if (activeIndex !== mediaItems.length - 1) e.currentTarget.style.opacity = 1 }}
            onMouseLeave={e => { if (activeIndex !== mediaItems.length - 1) e.currentTarget.style.opacity = 0.55 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </>)}

        {mediaItems.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 32, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 6, zIndex: 2,
          }}>
            {mediaItems.map((_, i) => (
              <div
                key={i}
                onClick={() => {
                  const panel = panelRef.current
                  if (!panel) return
                  const panelW = panel.clientWidth
                  const itemW  = panelW * ITEM_FR
                  targetX.current    = (panelW - itemW) / 2 - i * itemW
                  lastScroll.current = Date.now()
                }}
                style={{
                  width: i === activeIndex ? 16 : 4,
                  height: 4, borderRadius: 2,
                  backgroundColor: i === activeIndex ? '#ffffff' : '#333',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}

        <div
          ref={trackRef}
          style={{ display: 'flex', height: '100%', alignItems: 'center', willChange: 'transform' }}
        >
          {mediaItems.length > 0 ? mediaItems.map((item, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0,
                width: `${ITEM_FR * 100}%`,
                height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 24px',
                overflow: 'visible',
                transition: 'filter 0.55s ease, opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                filter:    i === activeIndex ? 'none'                   : 'blur(6px) brightness(0.62)',
                opacity:   i === activeIndex ? 1                        : 0.55,
                transform: i === activeIndex ? 'scale(1)'               : 'scale(0.94)',
                pointerEvents: i === activeIndex ? 'auto' : 'none',
              }}
            >
              {item.type === 'video' ? (
                <div
                  style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}
                  onMouseEnter={() => setShowLine(true)}
                  onMouseLeave={() => setShowLine(false)}
                >
                  <video
                    ref={el => { videoRefs.current[i] = el }}
                    src={fileUrl(item.data.asset._ref)}
                    muted loop playsInline
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onContextMenu={noCtx}
                    onTimeUpdate={e => {
                      if (i !== activeIndex || scrubbingRef.current) return
                      const v = e.target
                      setVideoProgress(v.duration ? v.currentTime / v.duration : 0)
                    }}
                    style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '72vh', display: 'block' }}
                  />
                  {i === activeIndex && (
                    <>
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${videoProgress * 100}%`,
                        width: 1,
                        background: 'rgba(255,255,255,0.85)',
                        boxShadow: '0 0 6px rgba(255,255,255,0.35)',
                        pointerEvents: 'none',
                        opacity: showLine || scrubbing ? 1 : 0,
                        transition: scrubbing ? 'left 0s, opacity 0.3s ease' : 'left 0.08s linear, opacity 0.3s ease',
                      }} />
                      <div style={{
                        position: 'absolute', top: -3,
                        left: `${videoProgress * 100}%`,
                        transform: 'translateX(-50%)',
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#fff',
                        pointerEvents: 'none',
                        opacity: showLine || scrubbing ? 1 : 0,
                        transition: scrubbing ? 'left 0s, opacity 0.3s ease' : 'left 0.08s linear, opacity 0.3s ease',
                      }} />
                      <div
                        onPointerDown={e => onVideoPointerDown(e, videoRefs.current[i])}
                        style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 2 }}
                      />
                    </>
                  )}
                </div>
              ) : (
                item.data?.asset?._ref && (
                  <img
                    src={imageUrl(item.data.asset._ref)}
                    alt={`${project.title} ${i + 1}`}
                    onContextMenu={noCtx} draggable={false}
                    style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '72vh', display: 'block', userSelect: 'none' }}
                  />
                )
              )}
            </div>
          )) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="font-sans text-[#ddd] text-[10px] tracking-[0.4em] uppercase">No media</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
