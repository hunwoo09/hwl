import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileUrlFor as fileUrl } from '../sanityImage'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function TheaterView({ project }) {
  const navigate    = useNavigate()
  const containerRef = useRef(null)
  const videoRef    = useRef(null)
  const hideTimer   = useRef(null)

  const [playing,   setPlaying]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [duration,  setDuration]  = useState(0)
  const [showUI,    setShowUI]    = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)

  // Rendered video rect (after objectFit:contain letterboxing)
  const [vRect, setVRect] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const playingRef    = useRef(false)
  const scrubbingRef  = useRef(false)
  const progressRef   = useRef(0)
  const vRectRef      = useRef(vRect)
  const theaterDotRef = useRef(null)

  useEffect(() => { playingRef.current   = playing   }, [playing])
  useEffect(() => { scrubbingRef.current = scrubbing }, [scrubbing])
  useEffect(() => { progressRef.current  = progress  }, [progress])
  useEffect(() => { vRectRef.current     = vRect      }, [vRect])

  useEffect(() => {
    const nav = document.querySelector('nav')
    if (!nav) return
    nav.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
    nav.style.transform  = 'translateY(-100%)'
    return () => {
      nav.style.transform = 'translateY(0)'
      nav.style.transition = 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }, [])

  const videos = (project.videos || []).filter(v => v?.asset?._ref)
  const src    = videos[0] ? fileUrl(videos[0].asset._ref) : null

  // ── Compute rendered video dimensions ─────────────────────────────────────
  const calcRect = useCallback(() => {
    const v   = videoRef.current
    const c   = containerRef.current
    if (!v || !c || !v.videoWidth) return
    const cw  = c.clientWidth,  ch = c.clientHeight
    const vw  = v.videoWidth,   vh = v.videoHeight
    const scale = Math.min(cw / vw, ch / vh)
    const rw  = vw * scale,     rh = vh * scale
    setVRect({ x: (cw - rw) / 2, y: (ch - rh) / 2, w: rw, h: rh })
  }, [])

  useEffect(() => {
    const ro = new ResizeObserver(calcRect)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [calcRect])

  // ── Auto-hide UI ──────────────────────────────────────────────────────────
  const wakeUI = useCallback(() => {
    setShowUI(true)
    clearTimeout(hideTimer.current)
    if (playingRef.current) {
      hideTimer.current = setTimeout(() => {
        if (!scrubbingRef.current) setShowUI(false)
      }, 2600)
    }
  }, [])

  // ── Play / Pause ──────────────────────────────────────────────────────────
  // UI wake/hold logic lives in the handlers (not an effect) so state updates
  // never cascade: pausing always pins the UI visible, playing arms the timer.
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (playingRef.current) {
      v.pause()
      playingRef.current = false
      setPlaying(false)
      clearTimeout(hideTimer.current)
      setShowUI(true)
    } else {
      v.play().catch(() => {})
      playingRef.current = true
      setPlaying(true)
      wakeUI()
    }
  }, [wakeUI])

  // ── Move cursors (global dot + in-theater dot) ───────────────────────────
  const moveCursor = useCallback((x, y) => {
    const dot = document.getElementById('cursor')
    if (dot) { dot.style.left = x + 'px'; dot.style.top = y + 'px' }
    if (theaterDotRef.current) {
      theaterDotRef.current.style.left = x + 'px'
      theaterDotRef.current.style.top  = y + 'px'
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    wakeUI()
    if (!scrubbingRef.current) moveCursor(e.clientX, e.clientY)
  }, [wakeUI, moveCursor])

  // ── Seek from screen X ────────────────────────────────────────────────────
  const seekFromX = useCallback((clientX) => {
    const { x, w } = vRectRef.current
    if (!w) return
    const pct = Math.max(0, Math.min(1, (clientX - x) / w))
    setProgress(pct)
    const v = videoRef.current
    if (v && v.duration) v.currentTime = pct * v.duration
  }, [])

  // ── Click/drag anywhere on video area to seek (desktop). Mobile: tap just
  // wakes the UI — fullscreen only via the dedicated button. ──
  const onAreaPointerDown = useCallback((e) => {
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (isTouchDevice) {
      wakeUI()
      return
    }
    e.preventDefault()
    setScrubbing(true)
    wakeUI()
    seekFromX(e.clientX)
    const clampX = (clientX) => {
      const { x, w } = vRectRef.current
      return w ? x + Math.max(0, Math.min(1, (clientX - x) / w)) * w : clientX
    }
    moveCursor(clampX(e.clientX), e.clientY)

    const onMove = (ev) => {
      seekFromX(ev.clientX)
      wakeUI()
      moveCursor(clampX(ev.clientX), ev.clientY)
    }
    const onUp = () => {
      setScrubbing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }, [seekFromX, wakeUI, moveCursor])

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current
    const inFS = !!(document.fullscreenElement || document.webkitFullscreenElement)
    if (!inFS) {
      if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen()
      else if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
    } else {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
    }
  }, [])

  // ── Video events ──────────────────────────────────────────────────────────
  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || scrubbingRef.current) return
    setProgress(v.duration ? v.currentTime / v.duration : 0)
  }
  const onMeta = (e) => { setDuration(e.target.duration); calcRect() }
  const onEnded = () => {
    playingRef.current = false
    setPlaying(false)
    clearTimeout(hideTimer.current)
    setShowUI(true)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.code === 'Space')  { e.preventDefault(); togglePlay() }
      if (e.code === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [togglePlay, navigate])

  if (!src) return null

  const lineX    = vRect.x + progress * vRect.w
  const uiOpacity = showUI ? 1 : 0

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position:   'fixed',
        inset:      0,
        background: '#000',
        overflow:   'hidden',
        cursor:     showUI ? 'default' : 'none',
        userSelect: 'none',
      }}
    >

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={src}
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onMeta}
        onEnded={onEnded}
        style={{
          position:   'absolute',
          inset:      0,
          width:      '100%',
          height:     '100%',
          objectFit:  'contain',
          zIndex:     1,
          cursor:     'none',
        }}
      />

      {/* ── In-theater cursor dot (only visible in fullscreen) ───────────── */}
      <div
        ref={theaterDotRef}
        style={{
          position:      'fixed',
          width:         5,
          height:        5,
          background:    '#ffffff',
          borderRadius:  '50%',
          transform:     'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex:        9999,
          display:       isFullscreen ? 'block' : 'none',
          opacity:       showUI ? 1 : 0,
          transition:    'opacity 0.45s ease',
        }}
      />

      {/* ── Full-area seek layer ──────────────────────────────────────────── */}
      <div
        onPointerDown={onAreaPointerDown}
        style={{
          position:      'absolute',
          inset:         0,
          zIndex:        2,
          cursor:        showUI ? 'crosshair' : 'none',
        }}
      />

      {/* ── Vertical playhead line + drag handle ──────────────────────────── */}
      {vRect.w > 0 && (
        <div
          style={{
            position:   'absolute',
            top:        0,
            left:       0,
            width:      '100%',
            height:     '100%',
            zIndex:     15,
            pointerEvents: 'none',
            opacity:    uiOpacity,
            transition: 'opacity 0.5s ease',
          }}
        >
          {/* Visual line — 2px white */}
          <div
            style={{
              position:   'absolute',
              left:       lineX - 1,
              top:        vRect.y,
              width:      2,
              height:     vRect.h,
              background: 'rgba(255,255,255,0.85)',
              boxShadow:  '0 0 10px rgba(255,255,255,0.5)',
              pointerEvents: 'none',
              transition: scrubbing ? 'none' : 'left 0.08s linear',
            }}
          />
          {/* Large dot at top of line */}
          <div
            style={{
              position:   'absolute',
              left:       lineX - 6,
              top:        vRect.y - 6,
              width:      12,
              height:     12,
              borderRadius: '50%',
              background: '#fff',
              boxShadow:  '0 0 8px rgba(255,255,255,0.4)',
              pointerEvents: 'none',
              transition: scrubbing ? 'none' : 'left 0.08s linear',
            }}
          />
        </div>
      )}


      {/* ── Info panel ────────────────────────────────────────────────────── */}
      <div
        style={{
          position:   'absolute',
          inset:      '0 auto 0 0',
          width:      'min(440px, 86vw)',
          background: 'rgba(6,6,6,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          transform:  panelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          zIndex:     30,
          display:    'flex',
          flexDirection: 'column',
          padding:    '96px 48px 56px',
          overflowY:  'auto',
        }}
      >
        <p style={{
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '11px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color:         'rgba(255,255,255,0.35)',
          marginBottom:  28,
        }}>
          Video
        </p>

        <h1 style={{
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      'clamp(1.8rem, 4vw, 2.8rem)',
          fontStyle:     'normal',
          fontWeight:    400,
          color:         '#ffffff',
          letterSpacing: '-0.01em',
          lineHeight:    1.15,
          marginBottom:  28,
        }}>
          {project.title}
        </h1>

        <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
          {[project.year, project.medium, project.location].filter(Boolean).map((m, i) => (
            <span key={i} style={{
              fontFamily:    '"Sequel Sans Heavy Disp"',
              fontSize:      '13px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color:         'rgba(255,255,255,0.55)',
            }}>
              {m}
            </span>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 32 }} />

        {project.description && (
          <p style={{
            fontFamily: '"Sequel Sans Book Body"',
            fontSize:   '16px',
            fontWeight: 300,
            lineHeight: 1.75,
            color:      'rgba(255,255,255,0.7)',
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-word',
          }}>
            {project.description}
          </p>
        )}
      </div>

      {/* ── Overlay controls ──────────────────────────────────────────────── */}
      <div
        style={{
          position:   'absolute',
          inset:      0,
          zIndex:     20,
          opacity:    uiOpacity,
          transition: 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}
      >

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position:      'absolute',
            top:           32,
            left:          32,
            fontFamily:    '"Sequel Sans Heavy Disp"',
            fontSize:      '14px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.55)',
            background:    'none',
            border:        'none',
            padding:       0,
            cursor:        'pointer',
            pointerEvents: showUI ? 'auto' : 'none',
            transition:    'color 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
        >
          ← Back
        </button>

        {/* Info toggle — top right */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          style={{
            position:      'absolute',
            top:           32,
            right:         32,
            fontFamily:    '"Sequel Sans Heavy Disp"',
            fontSize:      '14px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         panelOpen ? '#ffffff' : 'rgba(255,255,255,0.55)',
            background:    'none',
            border:        'none',
            padding:       0,
            cursor:        'pointer',
            pointerEvents: showUI ? 'auto' : 'none',
            transition:    'color 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={e => { e.currentTarget.style.color = panelOpen ? '#ffffff' : 'rgba(255,255,255,0.55)' }}
        >
          {panelOpen ? 'Close' : 'Info'}
        </button>

        {/* Project title — top center */}
        <p style={{
          position:      'absolute',
          top:           30,
          left:          '50%',
          transform:     'translateX(-50%)',
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      'clamp(20px, 2.6vw, 32px)',
          letterSpacing: '0.02em',
          color:         'rgba(255,255,255,0.85)',
          whiteSpace:    'nowrap',
          pointerEvents: 'none',
        }}>
          {project.title}
        </p>

        {/* Play / Pause — center */}
        <button
          onClick={togglePlay}
          style={{
            position:      'absolute',
            top:           '50%',
            left:          '50%',
            transform:     'translate(-50%, -50%)',
            width:         96,
            height:        96,
            borderRadius:  '50%',
            background:    'rgba(255,255,255,0.06)',
            border:        '2px solid rgba(255,255,255,0.22)',
            backdropFilter:'blur(6px)',
            cursor:        'pointer',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            pointerEvents: showUI ? 'auto' : 'none',
            transition:    'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background   = 'rgba(255,255,255,0.14)'
            e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.45)'
            e.currentTarget.style.transform    = 'translate(-50%, -50%) scale(1.05)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background   = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.22)'
            e.currentTarget.style.transform    = 'translate(-50%, -50%) scale(1)'
          }}
        >
          {playing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 5, height: 30, background: '#fff', borderRadius: 2 }} />
              <div style={{ width: 5, height: 30, background: '#fff', borderRadius: 2 }} />
            </div>
          ) : (
            <div style={{
              width: 0, height: 0,
              borderTop:    '15px solid transparent',
              borderBottom: '15px solid transparent',
              borderLeft:   '24px solid #fff',
              marginLeft:   6,
            }} />
          )}
        </button>

        {/* Time — bottom right */}
        <p style={{
          position:      'absolute',
          bottom:        30,
          right:         96,
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '15px',
          letterSpacing: '0.05em',
          color:         'rgba(255,255,255,0.55)',
          pointerEvents: 'none',
        }}>
          {fmtTime(duration * progress)} <span style={{ color: 'rgba(255,255,255,0.25)' }}>/</span> {fmtTime(duration)}
        </p>

        {/* Fullscreen — bottom right */}
        <button
          onClick={toggleFullscreen}
          style={{
            position:      'absolute',
            bottom:        20,
            right:         24,
            background:    'none',
            border:        'none',
            padding:       14,
            cursor:        'pointer',
            pointerEvents: showUI ? 'auto' : 'none',
            opacity:       0.75,
            transition:    'opacity 0.2s ease',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.75' }}
        >
          {isFullscreen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          )}
        </button>

      </div>

    </div>
  )
}
