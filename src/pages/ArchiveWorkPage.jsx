import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { transitionState } from '../transitionState'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import PageBuilder from '../components/PageBuilder'
import { imageProps, fileUrlFor as fileUrl } from '../sanityImage'

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

  // Smooth-scroll this page's own fixed wrapper — the global Lenis instance
  // (useSmoothScroll) only smooths window/document scroll, which this page
  // never uses (it scrolls its own fixed overflowY:auto wrapper instead).
  useEffect(() => {
    // Mobile: native touch scroll, no Lenis.
    if (isMobile || !pageRef.current || !contentRef.current) return
    const lenis = new Lenis({
      wrapper: pageRef.current,
      content: contentRef.current,
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    let rafId
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf) }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [isMobile])

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

      const activeVideo = videoRefs.current[idxRef.current]
      if (activeVideo && !scrubbingRef.current && activeVideo.duration) {
        setVideoProgress(activeVideo.currentTime / activeVideo.duration)
      }

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
  // Desktop only: the mobile editorial layout drives playback from viewport
  // visibility instead of an active index.
  useEffect(() => {
    if (isMobile) return
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === activeIndex) v.play?.().catch(() => {})
      else { v.pause(); v.currentTime = 0 }
    })
  }, [activeIndex, isMobile])

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

  // ── Mobile editorial layout: scroll-driven reveals, playback, progress ────
  const mobileScrollRef  = useRef(null)
  const progressLineRef  = useRef(null)
  useEffect(() => {
    if (!isMobile || !project) return
    const root = mobileScrollRef.current
    if (!root) return

    // Masked fade-up for each media block as it scrolls into view — same
    // easing family as every other reveal on the site.
    const items = root.querySelectorAll('[data-mreveal]')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        gsap.fromTo(en.target,
          { opacity: 0, y: 36 },
          { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' })
        io.unobserve(en.target)
      })
    }, { root, threshold: 0.12 })
    items.forEach(el => { el.style.opacity = 0; io.observe(el) })

    // Videos play only while actually on screen — battery + decode budget.
    const vids = root.querySelectorAll('video[data-mvideo]')
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) en.target.play?.().catch(() => {})
        else en.target.pause()
      })
    }, { root, threshold: 0.35 })
    vids.forEach(v => vio.observe(v))

    // Hairline read-progress under the navbar (transform only, no re-render)
    const onScroll = () => {
      const line = progressLineRef.current
      if (!line) return
      const max = root.scrollHeight - root.clientHeight
      line.style.transform = `scaleX(${max > 0 ? Math.min(1, root.scrollTop / max) : 0})`
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      io.disconnect()
      vio.disconnect()
      root.removeEventListener('scroll', onScroll)
    }
  }, [isMobile, project])

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
    <div ref={pageRef} className="no-scrollbar" style={{ position: 'fixed', inset: 0, backgroundColor: '#000000', overflowY: 'auto', overflowX: 'hidden' }}>
      <div ref={contentRef} style={{ position: 'relative', width: '100%', minHeight: '100%' }}>{child}</div>
    </div>
  )

  if (!project) return wrap(null)

  // ── Page Builder: if the Studio stacked custom modules, they replace the
  //    fixed gallery layout entirely — flexible per-article structure. ──────
  if (project.pageBuilder?.length > 0) {
    return wrap(
      <div style={{ position: 'relative', width: '100%' }}>
        <button
          onClick={handleBack}
          className="font-sans text-[#ccc] text-[10px] tracking-[0.35em] uppercase hover:text-[#ffffff] transition-colors duration-200"
          style={{
            position: 'fixed', top: 100, left: 24, zIndex: 60,
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
          }}
        >
          ← back
        </button>
        <PageBuilder blocks={project.pageBuilder} />
      </div>
    )
  }

  const year     = project.year
  const metaRest = [project.medium, project.location].filter(Boolean)

  // ── Mobile layout: editorial case-study scroll (mirrors WorkPage mobile) ──
  // One vertical read: title block, then every media item full-width in a
  // contact-sheet column, scroll-revealed. No pager, no filmstrip.
  if (isMobile) {
    const NAV_H = 'calc(52px + env(safe-area-inset-top, 0px))'
    const count = mediaItems.length
    const cat   = (project.category || '').replace('.', '').toLowerCase()

    // Sanity image refs encode intrinsic size ("image-abc-1200x800-jpg") —
    // gives each block its aspect ratio up front so the column never shifts
    // while images stream in.
    const refAspect = (ref) => {
      const m = /-(\d+)x(\d+)-/.exec(ref || '')
      return m ? `${m[1]} / ${m[2]}` : undefined
    }

    return wrap(
      <div
        ref={mobileScrollRef}
        className="no-scrollbar"
        data-lenis-prevent
        style={{
          position: 'absolute', inset: 0,
          overflowY: 'auto', overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: '#000',
        }}
      >
        {/* Read-progress hairline under the navbar */}
        <div style={{ position: 'fixed', top: NAV_H, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.07)', zIndex: 30, pointerEvents: 'none' }}>
          <div ref={progressLineRef} style={{ width: '100%', height: '100%', background: '#ffffff', transformOrigin: 'left', transform: 'scaleX(0)' }} />
        </div>

        {/* Back — fixed, ergonomic hit area */}
        <button
          onClick={handleBack}
          style={{
            position: 'fixed',
            top: `calc(${NAV_H} + 2px)`,
            left: 8, zIndex: 25,
            fontFamily: mono, fontSize: '10px', letterSpacing: '0.35em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
            background: 'none', border: 'none',
            minHeight: 44, padding: '14px 12px',
            textShadow: '0 1px 10px rgba(0,0,0,0.9)',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
          }}
        >
          ← back
        </button>

        {/* ── Title block ── */}
        <div ref={leftRef} style={{ padding: `calc(${NAV_H} + 76px) 24px 44px`, opacity: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '18px' }}>
            {cat && (
              <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#555' }}>
                .{cat}
              </span>
            )}
            <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.3em', color: '#333' }}>
              {String(count).padStart(2, '0')} MEDIA
            </span>
          </div>

          <h1 style={{
            fontFamily: mono, fontSize: 'clamp(2.4rem, 11.5vw, 4.2rem)',
            fontWeight: 300, letterSpacing: '-0.02em',
            color: '#ffffff', lineHeight: 0.98,
            overflowWrap: 'break-word',
            marginBottom: '22px',
          }}>
            {project.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', marginBottom: project.description ? '28px' : 0, borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '16px' }}>
            {year && (
              <span style={{ fontFamily: mono, fontSize: '1.3rem', fontWeight: 300, letterSpacing: '-0.01em', color: '#ffffff' }}>
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
              fontFamily: '"Sequel Sans Book Body"', fontSize: '13px', fontWeight: 300,
              lineHeight: 1.9, color: '#777',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              marginBottom: '28px',
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
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: 32, marginTop: '4px', textDecoration: 'none', fontFamily: mono, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}
                  >
                    <span style={{ color: '#333' }}>↓</span>
                    {f.label || `File ${i + 1}`}
                  </a>
                ) : null
              )}
            </div>
          )}
        </div>

        {/* ── Media column: contact sheet, hairline gaps ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mediaItems.map((item, i) => {
            if (item.type === 'image' && item.data?.asset?._ref) {
              return (
                <div key={i} data-mreveal style={{ position: 'relative' }}>
                  <img
                    {...imageProps(item.data, { widths: [480, 800, 1200], sizes: '100vw' })}
                    alt={`${project.title} ${i + 1}`}
                    onContextMenu={noCtx} draggable={false}
                    style={{
                      width: '100%', height: 'auto', display: 'block',
                      aspectRatio: refAspect(item.data.asset._ref),
                      backgroundColor: '#0a0a0a',
                      userSelect: 'none',
                    }}
                  />
                  <span style={{
                    position: 'absolute', bottom: 10, right: 12,
                    fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em',
                    color: 'rgba(255,255,255,0.4)',
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                    pointerEvents: 'none',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              )
            }
            if (item.type === 'video' && item.data?.asset?._ref) {
              return (
                <div key={i} data-mreveal style={{ position: 'relative' }}>
                  <video
                    data-mvideo
                    ref={el => { videoRefs.current[i] = el }}
                    src={fileUrl(item.data.asset._ref)}
                    muted loop playsInline preload="metadata"
                    disablePictureInPicture disableRemotePlayback
                    controlsList="nodownload nofullscreen noremoteplayback"
                    onContextMenu={noCtx}
                    style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#0a0a0a' }}
                  />
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => mobileFullscreenVideo(videoRefs.current[i])}
                    style={{
                      position: 'absolute', bottom: 12, right: 12, zIndex: 3,
                      width: 44, height: 44, borderRadius: 4,
                      background: 'rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                      <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                    </svg>
                  </button>
                </div>
              )
            }
            return null
          })}
        </div>

        {/* ── End mark ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
          padding: `72px 24px calc(56px + env(safe-area-inset-bottom, 0px))`,
        }}>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.18)' }} />
          <button
            onClick={handleBack}
            style={{
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.35em',
              textTransform: 'uppercase', color: '#555',
              background: 'none', border: 'none',
              minHeight: 44, padding: '12px 20px',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            }}
          >
            ← back
          </button>
        </div>
      </div>
    )
  }

  // ── Desktop layout: full-screen gallery + top overlay ───────────────────
  return wrap(
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* ── Top bar: title center ── */}
        <div
          ref={leftRef}
          style={{
            position: 'absolute', top: 100, left: 0, right: 0,
            height: 72, display: 'flex', alignItems: 'center',
            padding: '0 40px', zIndex: 60, opacity: 0,
          }}
        >
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
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '70vh', display: 'block' }}
                    />
                    {i === activeIndex && (
                      <>
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${videoProgress * 100}%`, width: 1,
                          background: '#fff',
                          mixBlendMode: 'difference',
                          pointerEvents: 'none',
                          opacity: showLine || scrubbing ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                        }} />
                        <div style={{
                          position: 'absolute', top: -3,
                          left: `${videoProgress * 100}%`,
                          transform: 'translateX(-50%)',
                          width: 7, height: 7, borderRadius: '50%',
                          background: '#fff',
                          mixBlendMode: 'difference',
                          pointerEvents: 'none',
                          opacity: showLine || scrubbing ? 1 : 0,
                          transition: 'opacity 0.3s ease',
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
                      {...imageProps(item.data, { widths: [600, 1000, 1600], sizes: '78vw' })}
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

