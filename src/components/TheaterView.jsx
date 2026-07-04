import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function fileUrl(ref) {
  return `https://cdn.sanity.io/files/18oh8tdj/production/${ref
    .replace('file-', '').replace(/-(\w+)$/, '.$1')}`
}

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

  // ── Click/drag anywhere on video area to seek (desktop) / fullscreen (mobile) ──
  const onAreaPointerDown = useCallback((e) => {
    const isTouchDevice = navigator.maxTouchPoints > 0
    if (isTouchDevice) {
      // On mobile: tap toggles fullscreen
      const v = videoRef.current
      const inFS = !!(document.fullscreenElement || document.webkitFullscreenElement)
      if (!inFS) {
        if (v?.webkitEnterFullscreen) v.webkitEnterFullscreen()
        else containerRef.current?.requestFullscreen?.()
      } else {
        if (document.exitFullscreen) document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      }
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
          {/* Visual line — 1px white */}
          <div
            style={{
              position:   'absolute',
              left:       lineX,
              top:        vRect.y,
              width:      1,
              height:     vRect.h,
              background: 'rgba(255,255,255,0.85)',
              boxShadow:  '0 0 6px rgba(255,255,255,0.35)',
              pointerEvents: 'none',
              transition: scrubbing ? 'none' : 'left 0.08s linear',
            }}
          />
          {/* Small dot at top of line */}
          <div
            style={{
              position:   'absolute',
              left:       lineX - 3,
              top:        vRect.y - 3,
              width:      7,
              height:     7,
              borderRadius: '50%',
              background: '#fff',
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
          width:      340,
          background: 'rgba(4,4,4,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          transform:  panelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.65s cubic-bezier(0.16,1,0.3,1)',
          zIndex:     30,
          display:    'flex',
          flexDirection: 'column',
          padding:    '80px 40px 52px',
          overflowY:  'auto',
        }}
      >
        <p style={{
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '8px',
          letterSpacing: '0.5em',
          textTransform: 'uppercase',
          color:         '#222',
          marginBottom:  36,
        }}>
          .MP4
        </p>

        <h1 style={{
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      'clamp(1rem, 2.2vw, 1.6rem)',
          fontStyle:     'normal',
          fontWeight:    300,
          color:         '#ffffff',
          letterSpacing: '-0.01em',
          lineHeight:    1.2,
          marginBottom:  24,
        }}>
          {project.title}
        </h1>

        <div style={{ display: 'flex', gap: 20, marginBottom: 36, flexWrap: 'wrap' }}>
          {[project.year, project.medium, project.location].filter(Boolean).map((m, i) => (
            <span key={i} style={{
              fontFamily:    '"Sequel Sans Heavy Disp"',
              fontSize:      '9px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color:         '#303030',
            }}>
              {m}
            </span>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 36 }} />

        {project.description && (
          <p style={{
            fontFamily: '"Sequel Sans Heavy Disp"',
            fontSize:   '11px',
            fontWeight: 300,
            lineHeight: 1.95,
            color:      '#404040',
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-word',
          }}>
            {project.description}
          </p>
        )}
      </div>

      {/* ── Info tab — fades with UI (stays if panel open) ────────────────── */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        style={{
          position:   'absolute',
          left:       panelOpen ? 340 : 0,
          top:        '50%',
          transform:  'translateY(-50%)',
          transition: 'left 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
          zIndex:     40,
          opacity:    (showUI || panelOpen) ? 1 : 0,
          pointerEvents: (showUI || panelOpen) ? 'auto' : 'none',
          background: 'rgba(6,6,6,0.8)',
          backdropFilter: 'blur(8px)',
          border:     '1px solid rgba(255,255,255,0.06)',
          borderLeft: 'none',
          borderRadius: '0 3px 3px 0',
          padding:    '18px 9px',
          cursor:     'pointer',
          display:    'flex',
          alignItems: 'center',
        }}
      >
        <span style={{
          fontFamily:      '"Sequel Sans Heavy Disp"',
          fontSize:        '8px',
          letterSpacing:   '0.35em',
          textTransform:   'uppercase',
          color:           '#3a3a3a',
          writingMode:     'vertical-rl',
          textOrientation: 'mixed',
          transform:       'rotate(180deg)',
        }}>
          {panelOpen ? 'close' : 'info'}
        </span>
      </button>

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
            top:           28,
            left:          28,
            fontFamily:    '"Sequel Sans Heavy Disp"',
            fontSize:      '9px',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color:         '#383838',
            background:    'none',
            border:        'none',
            padding:       0,
            cursor:        'pointer',
            pointerEvents: showUI ? 'auto' : 'none',
            transition:    'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#383838'}
        >
          ← back
        </button>

        {/* Project title — top center */}
        <p style={{
          position:      'absolute',
          top:           30,
          left:          '50%',
          transform:     'translateX(-50%)',
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '9px',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color:         '#222',
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
            width:         64,
            height:        64,
            borderRadius:  '50%',
            background:    'rgba(255,255,255,0.04)',
            border:        '1px solid rgba(255,255,255,0.12)',
            backdropFilter:'blur(6px)',
            cursor:        'pointer',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            pointerEvents: showUI ? 'auto' : 'none',
            transition:    'background 0.2s ease, border-color 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background   = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.28)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background   = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.12)'
          }}
        >
          {playing ? (
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ width: 2, height: 14, background: '#fff', borderRadius: 1 }} />
              <div style={{ width: 2, height: 14, background: '#fff', borderRadius: 1 }} />
            </div>
          ) : (
            <div style={{
              width: 0, height: 0,
              borderTop:    '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft:   '14px solid #fff',
              marginLeft:   3,
            }} />
          )}
        </button>

        {/* Time — bottom right */}
        <p style={{
          position:      'absolute',
          bottom:        18,
          right:         56,
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '8px',
          letterSpacing: '0.2em',
          color:         'rgba(255,255,255,0.18)',
          pointerEvents: 'none',
        }}>
          {fmtTime(duration * progress)} / {fmtTime(duration)}
        </p>

        {/* Fullscreen — bottom right */}
        <button
          onClick={toggleFullscreen}
          style={{
            position:      'absolute',
            bottom:        12,
            right:         16,
            background:    'none',
            border:        'none',
            padding:       4,
            cursor:        'pointer',
            pointerEvents: showUI ? 'auto' : 'none',
            opacity:       0.35,
            transition:    'opacity 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
              <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          )}
        </button>

      </div>

    </div>
  )
}
