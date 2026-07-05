import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { transitionState } from '../transitionState'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'

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

const noCtx   = (e) => e.preventDefault()
const ITEM_FR = 0.78   // archive gallery slide width (fraction of viewport)
const LERP    = 0.075
const SNAP_MS = 200

const mono = '"Sequel Sans Heavy Disp"'

export default function ArchiveWorkPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()

  const location = useLocation()
  const [project, setProject] = useState(location.state?.project ?? null)
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const [scrubbing,     setScrubbing]     = useState(false)
  const [showLine,      setShowLine]      = useState(false)

  const pageRef      = useRef(null)   // outer black page — slides in/out, mounts immediately
  const contentRef   = useRef(null)   // actual content — fades in once ready, independent of the slide
  const revealedRef  = useRef(false)  // fade the content in once, not on every re-render
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
  }, [id, project?._id])

  useEffect(() => {
    if (!project || !leftRef.current) return
    gsap.set(leftRef.current, { opacity: 1 })
    const kids = Array.from(leftRef.current.children)
    gsap.fromTo(kids,
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09 }
    )
  }, [project])

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
  }, [project])

  // ── Fade the black page in on arrival from the list view ──────────────────
  // Fires on mount, independent of the data fetch below — so its speed always
  // matches the navbar's black-tab indicator tween exactly (duration + ease),
  // regardless of how long the project data takes to load.
  useLayoutEffect(() => {
    if (!location.state?.fromList || !pageRef.current) return
    gsap.set(pageRef.current, { opacity: 0 })
    if (contentRef.current) gsap.set(contentRef.current, { opacity: 0 })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!location.state?.fromList || !pageRef.current) return
    gsap.to(pageRef.current, { opacity: 1, duration: 0.7, ease: 'power3.inOut' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade the content in once it's actually ready (once only) ──────────────
  useEffect(() => {
    if (!project || !contentRef.current || revealedRef.current) return
    if (!location.state?.fromList) { revealedRef.current = true; return }
    revealedRef.current = true
    gsap.to(contentRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' })
  }, [project]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (exitingRef.current) return
    exitingRef.current = true
    if (location.state?.fromList) transitionState.returnedFromList = true
    if (location.state?.fromList && pageRef.current) {
      gsap.to(pageRef.current, { opacity: 0, duration: 0.7, ease: 'power3.inOut', onComplete: () => navigate(-1) })
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
      setVideoProgress(0)
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
          setVideoProgress(0)
        }
      }

      gsap.set(track, { x: Math.round(currentX.current) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [project, snapNearest])

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
  }, [project, clampTarget])

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
  }, [project, clampTarget])

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
  }, [project, clampTarget])

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
  }, [])

  // ── Video scrubber ─────────────────────────────────────────────────────────

  useEffect(() => { scrubbingRef.current = scrubbing }, [scrubbing])

  // Auto-play active video, pause others (progress reset happens where the
  // index changes — snapNearest / the RAF tick — to keep this effect DOM-only)
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === activeIndex) v.play?.().catch(() => {})
      else { v.pause(); v.currentTime = 0 }
    })
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

  const mobileFullscreenVideo = useCallback((v) => {
    if (!v) return
    if (v.webkitEnterFullscreen) v.webkitEnterFullscreen()
    else if (v.requestFullscreen) v.requestFullscreen()
  }, [])

  const mediaItems = !project ? [] : [
    ...(project.videoFile?.asset?._ref
      ? [{ type: 'video', data: { asset: project.videoFile.asset } }] : []),
    ...(project.videos  || []).map(v   => ({ type: 'video', data: v })),
    ...(() => {
      const ref = project.coverImage?.asset?._ref ?? project.coverImage?.assetRef
      return ref ? [{ type: 'image', data: { asset: { _ref: ref } } }] : []
    })(),
    ...(project.images  || []).map(img => ({ type: 'image', data: img })),
  ]

  useLayoutEffect(() => {
    itemFrRef.current = ITEM_FR
    countRef.current  = mediaItems.length
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  // `wrap` is the outer black page: it always mounts on the first render, so
  // the slide-in/out above never waits on data. `contentRef` fades whatever's
  // inside it in once, without restarting when the inner content later swaps.
  const wrap = (child) => (
    <div ref={pageRef} style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', overflow: 'hidden' }}>
      <div ref={contentRef} style={{ position: 'relative', width: '100%', height: '100%' }}>{child}</div>
    </div>
  )

  if (!project) return wrap(null)

  const year     = project.year
  const metaRest = [project.medium, project.location].filter(Boolean)

  // ── Mobile layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    const STRIP_H    = 152
    const NAV_H      = 'calc(52px + env(safe-area-inset-top, 0px))'
    const activeItem = mediaItems[activeIndex]

    return wrap(
      <div
        style={{ backgroundColor: '#000', minHeight: '100dvh', paddingBottom: STRIP_H + 24 + 'px' }}
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

  // ── Desktop layout: full-screen gallery + top overlay ───────────────────
  return wrap(
      <div style={{ position: 'absolute', inset: 0 }}>
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
                    const itemW  = panelW * ITEM_FR
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
                  width: `${ITEM_FR * 100}%`,
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

