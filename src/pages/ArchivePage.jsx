import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { transitionState } from '../transitionState'
import { useIsMobile } from '../hooks/useIsMobile'
import { imageProps, fileUrlFor } from '../sanityImage'

const monoDisp = '"Sequel Sans Heavy Disp"'

// Mini theater-mode player for the archive grid cover — same scrub timeline
// and fullscreen affordance as the full project pager, scaled down to a
// grid tile. Owns its own progress/hover state since many mount at once.
function ArchiveCoverVideo({ src, isMobile, filterStyle }) {
  const videoRef      = useRef(null)
  const scrubbingRef   = useRef(false)
  const [progress,   setProgress]   = useState(0)
  const [hover,      setHover]      = useState(false)
  const [scrubbing,  setScrubbing]  = useState(false)

  useEffect(() => { scrubbingRef.current = scrubbing }, [scrubbing])

  useEffect(() => {
    let raf
    const tick = () => {
      const v = videoRef.current
      if (v && !scrubbingRef.current && v.duration) {
        setProgress(v.currentTime / v.duration)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const seek = useCallback((clientX) => {
    const v = videoRef.current
    if (!v) return
    const rect = v.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setProgress(pct)
    if (v.duration) v.currentTime = pct * v.duration
  }, [])

  const onScrubDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setScrubbing(true)
    seek(e.clientX)
    const onMove = (ev) => seek(ev.clientX)
    const onUp   = () => {
      setScrubbing(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
  }, [seek])

  const enterFullscreen = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) v.requestFullscreen()
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen()
  }, [])

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        draggable={false}
        style={{
          width:      '100%',
          height:     '100%',
          objectFit:  'contain',
          display:    'block',
          userSelect: 'none',
          filter:     filterStyle,
        }}
      />

      <div style={{
        position:      'absolute', top: 0, bottom: 0,
        left:          `${progress * 100}%`, width: 1,
        background:    '#fff',
        mixBlendMode:  'difference',
        pointerEvents: 'none',
        opacity:       hover || scrubbing ? 1 : 0,
        transition:    'opacity 0.3s ease',
      }} />
      <div style={{
        position:      'absolute', top: -2,
        left:          `${progress * 100}%`,
        transform:     'translateX(-50%)',
        width:         5, height: 5, borderRadius: '50%',
        background:    '#fff',
        mixBlendMode:  'difference',
        pointerEvents: 'none',
        opacity:       hover || scrubbing ? 1 : 0,
        transition:    'opacity 0.3s ease',
      }} />
      <div
        onPointerDown={onScrubDown}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 2 }}
      />

      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={enterFullscreen}
        style={{
          position:   'absolute', bottom: 6, right: 6, zIndex: 3,
          width:      isMobile ? 26 : 22,
          height:     isMobile ? 26 : 22,
          borderRadius: 3,
          background: 'rgba(0,0,0,0.55)',
          border:     '1px solid rgba(255,255,255,0.2)',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
          cursor:     'pointer',
          opacity:    isMobile ? 1 : (hover ? 1 : 0),
          transition: 'opacity 0.25s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </button>
    </div>
  )
}

export default function ArchivePage() {
  const [projects, setProjects] = useState([])
  // Default 1100 breakpoint — this page was the only one still on 768, so
  // 768–1100 tablets got the desktop 5-col grid under the mobile navbar.
  const isMobile = useIsMobile()

  const sectionRef       = useRef(null)
  const letterRefs       = useRef([])
  const frameRefs        = useRef([])
  const boxRefs          = useRef([])
  const labelRefs        = useRef([])
  const entranceStarted  = useRef(false)
  const exitingRef       = useRef(false)
  const navigate         = useNavigate()

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && (category == "archive" || category == ".archive")]
        | order(orderRank asc, _createdAt desc)`)
      .then(setProjects)
  }, [])

  // Letter-by-letter heading reveal
  useEffect(() => {
    const letters = letterRefs.current.filter(Boolean)
    if (!letters.length) return
    gsap.set(letters, { yPercent: 110 })
    gsap.to(letters, {
      yPercent: 0,
      duration: 0.7,
      delay:    0.55,
      ease:     'power3.out',
      force3D:  true,
    })
    return () => gsap.killTweensOf(letters)
  }, [])

  // Grid entrance — images wipe up from behind the static black box, labels reveal through a clip mask
  useEffect(() => {
    if (!projects.length || entranceStarted.current) return
    entranceStarted.current = true

    const frames = frameRefs.current.filter(Boolean)
    const boxes  = boxRefs.current.filter(Boolean)
    const labels = labelRefs.current.filter(Boolean)
    if (!boxes.length) return

    gsap.set(frames, { opacity: 0 })
    gsap.set(boxes,  { yPercent: 100, force3D: true })
    gsap.set(labels, { yPercent: 110, force3D: true })

    const tl = gsap.timeline({ delay: 0.75 })
    tl.to(frames, {
      opacity:  1,
      duration: 0.4,
      ease:     'power1.out',
    })
    tl.to(boxes, {
      yPercent:   0,
      duration:   0.85,
      ease:       'power3.out',
      clearProps: 'transform,willChange',
    }, '<')
    tl.to(labels, {
      yPercent:   0,
      duration:   0.6,
      ease:       'power3.out',
      clearProps: 'transform,willChange',
    }, '-=0.55')

    return () => tl.kill()
  }, [projects.length])

  const handleClick = useCallback((project) => {
    if (exitingRef.current) return
    exitingRef.current = true
    transitionState.fromList = true
    gsap.to(sectionRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => navigate(`/archive/${project._id}`, { state: { project, fromList: true } }),
    })
  }, [navigate])

  return (
    <section
      ref={sectionRef}
      style={{
        backgroundColor: '#000',
        minHeight:       '100vh',
        paddingTop:      isMobile ? 'calc(env(safe-area-inset-top, 0px) + 92px)' : '132px',
        paddingBottom:   isMobile ? 48 : 88,
      }}
    >
      <style>{`
        .archive-card { -webkit-tap-highlight-color: transparent; }
        .archive-card img, .archive-card video { transition: filter 0.4s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1); }
        @media (hover: hover) {
          .archive-card:hover img, .archive-card:hover video { filter: none; transform: scale(1.045); }
        }
      `}</style>

      <div style={{ overflow: 'hidden', lineHeight: 0.88, textAlign: 'center', marginBottom: isMobile ? 32 : 56 }}>
        {'ARCHIVE'.split('').map((letter, i) => (
          <span
            key={i}
            ref={el => { letterRefs.current[i] = el }}
            style={{
              display:    'inline-block',
              fontFamily: monoDisp,
              fontSize:   'clamp(2.5rem, 14vw, 8rem)',
              fontWeight: 900,
              lineHeight: 0.88,
              color:      '#ffffff',
              userSelect: 'none',
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {projects.length === 0 ? null : (
        <div
          style={{
            display:              'grid',
            gridTemplateColumns:  isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
            gap:                  isMobile ? 10 : 32,
            padding:              isMobile ? '0 14px' : '0 60px',
            maxWidth:             1600,
            margin:               '0 auto',
          }}
        >
          {projects.map((project, i) => {
            const hasImage = !!project.coverImage?.asset?._ref
            const coverVideoRef = !hasImage ? project.videos?.find(v => v?.asset?._ref)?.asset?._ref : null
            const hasVideo = !!coverVideoRef
            return (
              <div
                key={project._id}
                className="archive-card"
                onClick={() => handleClick(project)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  ref={el => { frameRefs.current[i] = el }}
                  style={{
                    position:        'relative',
                    width:           '100%',
                    aspectRatio:     '1 / 1',
                    overflow:        'hidden',
                    border:          '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: '#0a0a0a',
                  }}
                >
                  {hasImage && (
                    <div
                      ref={el => { boxRefs.current[i] = el }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <img
                        {...imageProps(project.coverImage, {
                          widths: [300, 600, 900],
                          sizes:  isMobile ? '33vw' : '20vw',
                        })}
                        alt={project.title}
                        draggable={false}
                        style={{
                          width:      '100%',
                          height:     '100%',
                          objectFit:  'contain',
                          display:    'block',
                          userSelect: 'none',
                          filter:     'grayscale(45%) brightness(0.7)',
                        }}
                      />
                    </div>
                  )}
                  {hasVideo && (
                    <div
                      ref={el => { boxRefs.current[i] = el }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <ArchiveCoverVideo
                        src={fileUrlFor(coverVideoRef)}
                        isMobile={isMobile}
                        filterStyle="grayscale(45%) brightness(0.7)"
                      />
                    </div>
                  )}
                </div>

                <div style={{ overflow: 'hidden', marginTop: isMobile ? 8 : 12 }}>
                  <span
                    ref={el => { labelRefs.current[i] = el }}
                    style={{
                      display:       'block',
                      fontFamily:    monoDisp,
                      fontWeight:    900,
                      fontSize:      'clamp(0.6rem, 1.1vw, 0.95rem)',
                      letterSpacing: '0.01em',
                      textTransform: 'uppercase',
                      color:         '#ffffff',
                      whiteSpace:    'nowrap',
                      overflow:      'hidden',
                      textOverflow:  'ellipsis',
                    }}
                  >
                    {project.title}{project.year ? `, ${project.year}` : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
