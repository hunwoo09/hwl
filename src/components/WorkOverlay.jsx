import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useIsMobile } from '../hooks/useIsMobile'

const LEFT_W  = 420
const ITEM_FR = 0.78
const LERP    = 0.075
const SNAP_MS = 200
const mono    = '"Sequel Sans Heavy Disp"'
const noCtx   = (e) => e.preventDefault()

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '').replace(/-(\w+)$/, '.$1')}`
}

function fileUrl(ref) {
  return `https://cdn.sanity.io/files/18oh8tdj/production/${ref
    .replace('file-', '').replace(/-(\w+)$/, '.$1')}`
}

// Hero's GROQ expands coverImage.asset->{ metadata } which drops asset._ref.
// Normalise so mediaItems always sees { asset: { _ref } }.
function normaliseCover(coverImage) {
  if (!coverImage) return null
  const ref = coverImage.assetRef ?? coverImage.asset?._ref
  return ref ? { asset: { _ref: ref } } : null
}

export default function WorkOverlay({ project, imageRef, clickedRect, onClose, galleryEl }) {
  const isMobile = useIsMobile()

  // ── Refs ─────────────────────────────────────────────────────────────────
  const leftRef    = useRef(null)
  const flyRef     = useRef(null)   // cover image used for open/close transition
  const panelRef   = useRef(null)   // slider panel
  const trackRef   = useRef(null)
  const videoRefs  = useRef([])
  const scrubbingRef = useRef(false)

  const targetX    = useRef(0)
  const currentX   = useRef(0)
  const prevX      = useRef(0)
  const lastScroll = useRef(0)
  const idxRef     = useRef(0)
  const countRef   = useRef(0)

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeIndex,   setActiveIndex]   = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const [scrubbing,     setScrubbing]     = useState(false)
  const [showLine,      setShowLine]      = useState(false)

  useEffect(() => { scrubbingRef.current = scrubbing }, [scrubbing])

  // ── Media items ──────────────────────────────────────────────────────────
  const cover = normaliseCover(project?.coverImage)
  const mediaItems = [
    ...(project?.videoFile?.asset?._ref
      ? [{ type: 'video', data: { asset: project.videoFile.asset } }] : []),
    ...(project?.videos || []).map(v => ({ type: 'video', data: v })),
    ...(cover ? [{ type: 'image', data: cover }] : []),
    ...(project?.images || []).map(img => ({ type: 'image', data: img })),
  ]
  countRef.current = mediaItems.length

  // ── Slider init ──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const panelW = panel.clientWidth
    const itemW  = panelW * ITEM_FR
    const initX  = (panelW - itemW) / 2
    targetX.current  = initX
    currentX.current = initX
    prevX.current    = initX
    idxRef.current   = 0
    setActiveIndex(0)
    if (trackRef.current) gsap.set(trackRef.current, { x: initX })
  }, [])

  // ── Snap ────────────────────────────────────────────────────────────────
  const snapNearest = useCallback(() => {
    const panel = panelRef.current
    if (!panel || !countRef.current) return
    const panelW  = panel.clientWidth
    const itemW   = panelW * ITEM_FR
    const k       = Math.round(((panelW - itemW) / 2 - currentX.current) / itemW)
    const clamped = Math.max(0, Math.min(k, countRef.current - 1))
    targetX.current = (panelW - itemW) / 2 - clamped * itemW
    if (clamped !== idxRef.current) {
      idxRef.current = clamped
      setActiveIndex(clamped)
    }
  }, [])

  // ── RAF tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf, snapped = false
    const tick = () => {
      currentX.current += (targetX.current - currentX.current) * LERP
      const vel = currentX.current - prevX.current
      prevX.current = currentX.current
      const idle = Date.now() - lastScroll.current > SNAP_MS
      if (idle && Math.abs(vel) < 0.4 && !snapped) { snapped = true; snapNearest() }
      else if (!idle) snapped = false
      const panel = panelRef.current
      if (panel && countRef.current > 0) {
        const panelW  = panel.clientWidth
        const itemW   = panelW * ITEM_FR
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
  }, [snapNearest])

  // ── Wheel ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      targetX.current   -= delta * 0.85
      lastScroll.current = Date.now()
    }
    panel.addEventListener('wheel', onWheel, { passive: false })
    return () => panel.removeEventListener('wheel', onWheel)
  }, [])

  // ── Touch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    let startX = 0, startY = 0, startTX = 0, isH = null
    const onStart = (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY
      startTX = targetX.current; isH = null
    }
    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (isH === null) isH = Math.abs(dx) > Math.abs(dy)
      if (isH) { e.preventDefault(); targetX.current = startTX + dx * 1.4; lastScroll.current = Date.now() }
    }
    panel.addEventListener('touchstart', onStart, { passive: true })
    panel.addEventListener('touchmove',  onMove,  { passive: false })
    return () => {
      panel.removeEventListener('touchstart', onStart)
      panel.removeEventListener('touchmove',  onMove)
    }
  }, [])

  // ── Pointer drag ─────────────────────────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    let dragging = false, startX = 0, startTX = 0
    const onDown = (e) => { dragging = true; startX = e.clientX; startTX = targetX.current; lastScroll.current = Date.now() }
    const onMove = (e) => { if (!dragging) return; targetX.current = startTX + (e.clientX - startX); lastScroll.current = Date.now() }
    const onUp   = () => { dragging = false }
    panel.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      panel.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── ResizeObserver ───────────────────────────────────────────────────────
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const ro = new ResizeObserver(() => {
      const panelW = panel.clientWidth
      const itemW  = panelW * ITEM_FR
      const snap   = (panelW - itemW) / 2 - idxRef.current * itemW
      targetX.current  = snap
      currentX.current = snap
      if (trackRef.current) gsap.set(trackRef.current, { x: snap })
    })
    ro.observe(panel)
    return () => ro.disconnect()
  }, [])

  // ── Video auto-play ──────────────────────────────────────────────────────
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === activeIndex) v.play().catch(() => {})
      else { v.pause(); v.currentTime = 0 }
    })
  }, [activeIndex])

  // ── Open animation ───────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    const mob = vw < 768
    const tl  = gsap.timeline()

    if (galleryEl) {
      galleryEl.style.pointerEvents = 'none'
      tl.to(galleryEl, { opacity: 0, duration: 0.25, ease: 'power2.out' }, 0)
    }

    // Flying cover image expands from clicked rect → right panel, then fades out
    if (flyRef.current && imageRef) {
      if (!mob && clickedRect) {
        gsap.set(flyRef.current, {
          left: clickedRect.left, top: clickedRect.top,
          width: clickedRect.width, height: clickedRect.height,
          opacity: 1,
        })
        tl.to(flyRef.current, {
          left: LEFT_W, top: 0, width: vw - LEFT_W, height: vh,
          duration: 0.55, ease: 'power3.inOut',
          onComplete: () => gsap.to(flyRef.current, { opacity: 0, duration: 0.22 }),
        }, 0)
      } else {
        gsap.set(flyRef.current, { opacity: 0 })
      }
    }

    // Left panel slides in
    if (leftRef.current) {
      if (!mob) {
        gsap.set(leftRef.current, { x: -LEFT_W, opacity: 0 })
        tl.to(leftRef.current, { x: 0, opacity: 1, duration: 0.52, ease: 'power3.out' }, 0.1)
      } else {
        gsap.set(leftRef.current, { y: 48, opacity: 0 })
        tl.to(leftRef.current, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, 0.28)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close animation ──────────────────────────────────────────────────────
  function handleClose() {
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    const mob = vw < 768
    const tl  = gsap.timeline({ onComplete: onClose })

    if (leftRef.current) {
      if (!mob) tl.to(leftRef.current, { x: -LEFT_W, opacity: 0, duration: 0.32, ease: 'power2.in' }, 0)
      else       tl.to(leftRef.current, { y: 40, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
    }

    // Cover the slider with the fly image, then shrink it back to origin
    if (flyRef.current && imageRef && !mob && clickedRect) {
      tl.set(flyRef.current, { left: LEFT_W, top: 0, width: vw - LEFT_W, height: vh, opacity: 1 }, 0)
      tl.to(flyRef.current, {
        left: clickedRect.left, top: clickedRect.top,
        width: clickedRect.width, height: clickedRect.height,
        duration: 0.48, ease: 'power3.inOut',
      }, 0.05)
    } else if (flyRef.current) {
      tl.to(flyRef.current, { opacity: 0, duration: 0.28 }, 0)
    }

    if (galleryEl) {
      tl.to(galleryEl, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.22)
      tl.call(() => { galleryEl.style.pointerEvents = '' }, [], 0.22)
    }
  }

  const meta = [project?.year, project?.medium, project?.location].filter(Boolean)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 1000,
      backgroundColor: '#000000',
      pointerEvents: 'all',
    }}>

      {/* ── Left info panel ────────────────────────────────────────────── */}
      <div
        ref={leftRef}
        style={{
          position:    'absolute',
          left: 0, top: 0,
          width:       isMobile ? '100%' : LEFT_W,
          height:      '100vh',
          borderRight: isMobile ? 'none' : '1px solid #222',
          display:     'flex', flexDirection: 'column',
          padding:     isMobile ? '120px 24px 40px' : '130px 32px 48px',
          overflowY:   'auto',
          boxSizing:   'border-box',
          zIndex:      2,
        }}
      >
        <button
          onClick={handleClose}
          style={{
            fontFamily:    mono, fontSize: '10px', letterSpacing: '0.35em',
            textTransform: 'uppercase', color: '#444',
            background: 'none', border: 'none',
            padding: 0, cursor: 'pointer',
            textAlign: 'left', marginBottom: 40,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444' }}
        >
          ← back
        </button>

        <h1 style={{
          fontFamily:    mono, fontWeight: 300, fontStyle: 'normal',
          fontSize:      'clamp(2rem, 3vw, 3rem)',
          lineHeight:    0.95, letterSpacing: '-0.02em',
          color:         '#ffffff', marginBottom: 20,
        }}>
          {project?.title}
        </h1>

        {meta.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 32 }}>
            {meta.map((m, i) => (
              <span key={i} style={{
                fontFamily:    mono, fontSize: '10px',
                letterSpacing: '0.25em', textTransform: 'uppercase', color: '#444',
              }}>{m}</span>
            ))}
          </div>
        )}

        {project?.description && (
          <p style={{
            fontFamily: mono, fontSize: '13px',
            fontWeight: 300, lineHeight: 1.75,
            color: '#666', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {project.description}
          </p>
        )}

        {project?.codeFiles?.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: 32 }}>
            <p style={{
              fontFamily: mono, fontSize: '9px',
              letterSpacing: '0.4em', textTransform: 'uppercase',
              color: '#333', marginBottom: 8,
            }}>Files</p>
            {project.codeFiles.map((f, i) =>
              f?.asset?._ref ? (
                <a key={i} href={fileUrl(f.asset._ref)} download
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    fontFamily: mono, fontSize: '10px', letterSpacing: '0.2em',
                    textTransform: 'uppercase', color: '#555', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
                  }}
                >
                  <span style={{ color: '#333' }}>↓</span>
                  {f.label || `File ${i + 1}`}
                </a>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* ── Right: filmstrip slider ──────────────────────────────────────── */}
      {!isMobile && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            left: LEFT_W, top: 0, right: 0, bottom: 0,
            overflow: 'hidden',
            cursor: 'default',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 11%, black 89%, transparent 100%)',
            maskImage:        'linear-gradient(to right, transparent 0%, black 11%, black 89%, transparent 100%)',
            zIndex: 1,
          }}
        >
          {/* Dot navigation */}
          {mediaItems.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 32, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', gap: 6, zIndex: 3,
              pointerEvents: 'all',
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
                    width:  i === activeIndex ? 16 : 4,
                    height: 4, borderRadius: 2,
                    backgroundColor: i === activeIndex ? '#ffffff' : '#333',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}

          {/* Track */}
          <div
            ref={trackRef}
            style={{ display: 'flex', height: '100%', alignItems: 'center', willChange: 'transform' }}
          >
            {mediaItems.map((item, i) => {
              const act = i === activeIndex
              return (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    width:  `${ITEM_FR * 100}%`,
                    height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 24px',
                    transition: 'filter 0.55s ease, opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                    filter:    act ? 'none' : 'blur(6px) brightness(0.62)',
                    opacity:   act ? 1 : 0.55,
                    transform: act ? 'scale(1)' : 'scale(0.94)',
                    pointerEvents: act ? 'auto' : 'none',
                  }}
                >
                  {item.type === 'video' && item.data?.asset?._ref ? (
                    <video
                      ref={el => { videoRefs.current[i] = el }}
                      src={fileUrl(item.data.asset._ref)}
                      muted loop playsInline
                      disablePictureInPicture
                      onContextMenu={noCtx}
                      onTimeUpdate={e => {
                        if (i !== activeIndex || scrubbingRef.current) return
                        const v = e.target
                        setVideoProgress(v.duration ? v.currentTime / v.duration : 0)
                      }}
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '72vh', display: 'block' }}
                    />
                  ) : item.type === 'image' && item.data?.asset?._ref ? (
                    <img
                      src={imageUrl(item.data.asset._ref)}
                      alt={project?.title}
                      onContextMenu={noCtx} draggable={false}
                      style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '72vh', display: 'block', userSelect: 'none' }}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Flying cover image (transition layer, z-index above slider) ─── */}
      {imageRef && (
        <img
          ref={flyRef}
          src={imageUrl(imageRef)}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            objectFit: 'cover',
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />
      )}
    </div>
  )
}
