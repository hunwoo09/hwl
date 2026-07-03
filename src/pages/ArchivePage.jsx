import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

const mono = '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace'

const PANEL_COLLAPSED  = 50
const PANEL_EXPANDED   = 340
const PANEL_EXPANDED_M = 200
const PANEL_GAP        = 4
const BREAKPOINT       = 768

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

export default function ArchivePage() {
  const [projects,     setProjects]     = useState([])
  const [focusedPanel, setFocusedPanel] = useState(null)
  const [trackWidth,   setTrackWidth]   = useState(0)
  const [isMobile,     setIsMobile]     = useState(false)
  const [entered,      setEntered]      = useState(false)  // true once entrance done

  const trackRef        = useRef(null)
  const panelRefs       = useRef([])
  const letterRefs      = useRef([])
  const entranceStarted = useRef(false)
  const navigate        = useNavigate()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && (category == "archive" || category == ".archive")]
        | order(orderRank asc, _createdAt desc)`)
      .then(setProjects)
  }, [])

  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width)
      setIsMobile(window.innerWidth < BREAKPOINT)
    })
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { setFocusedPanel(null) }, [projects.length])

  // Letter-by-letter reveal — overlaps with tail of WipeTransition wipe-up
  useEffect(() => {
    const letters = letterRefs.current.filter(Boolean)
    if (!letters.length) return
    gsap.set(letters, { yPercent: 110 })
    gsap.to(letters, {
      yPercent: 0,
      duration: 0.7,
      stagger: 0.055,
      delay: 0.55,
      ease: 'power3.out',
      force3D: true,
    })
    return () => gsap.killTweensOf(letters)
  }, [])

  // GSAP entrance — runs once when projects + layout are ready
  useEffect(() => {
    if (!projects.length || !trackWidth || entranceStarted.current) return
    entranceStarted.current = true

    const panels = panelRefs.current.filter(Boolean)
    if (!panels.length) return

    gsap.set(panels, { opacity: 0 })

    gsap.to(panels, {
      opacity:  1,
      duration: 0.65,
      stagger:  0.06,
      delay:    0.85,
      ease:     'power2.out',
      onComplete: () => {
        gsap.set(panels, { clearProps: 'opacity' })
        setEntered(true)
      },
    })

    return () => gsap.killTweensOf(panels)
  }, [projects.length, trackWidth])

  const expandedW = isMobile ? PANEL_EXPANDED_M : PANEL_EXPANDED
  const trackH    = isMobile ? PANEL_EXPANDED_M : PANEL_EXPANDED

  const getPanelPos = useCallback((idx) => {
    const n = projects.length
    if (!n || !trackWidth) return { left: 0, width: PANEL_COLLAPSED }
    const totalW = focusedPanel !== null
      ? (n - 1) * (PANEL_COLLAPSED + PANEL_GAP) + expandedW
      : n * PANEL_COLLAPSED + (n - 1) * PANEL_GAP
    const offset = Math.max(0, (trackWidth - totalW) / 2)
    let left = offset
    for (let i = 0; i < idx; i++) {
      left += (i === focusedPanel ? expandedW : PANEL_COLLAPSED) + PANEL_GAP
    }
    return { left, width: idx === focusedPanel ? expandedW : PANEL_COLLAPSED }
  }, [focusedPanel, projects.length, expandedW, trackWidth])

  const handleClick = useCallback((project) => {
    navigate(`/work/${project._id}`, { state: { project } })
  }, [navigate])

  // Reset ref array before each render
  panelRefs.current = []

  return (
    <section style={{
      backgroundColor: '#000',
      height:          '100vh',
      overflow:        'hidden',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      gap:             48,
      paddingTop:      72,
    }}>

      <div style={{ overflow: 'hidden', flexShrink: 0, lineHeight: 0.88, willChange: 'transform' }}>
        {'ARCHIVE'.split('').map((letter, i) => (
          <span
            key={i}
            ref={el => { letterRefs.current[i] = el }}
            style={{
              display:    'inline-block',
              fontFamily: '"Sequel Sans Heavy Disp", "Sequel Sans Heavy Disp", "Noto Sans Mono", monospace',
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

      <div
        ref={trackRef}
        onMouseLeave={() => entered && setFocusedPanel(null)}
        style={{ position: 'relative', width: '100%', height: `${trackH}px`, flexShrink: 0 }}
      >
        {projects.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#333' }}>
              Loading
            </p>
          </div>
        ) : projects.map((project, i) => {
          const { left, width } = getPanelPos(i)
          const isActive = i === focusedPanel
          const hasImage = !!project.coverImage?.asset?._ref

          return (
            <div
              key={`${isMobile ? 'm' : 'd'}-${project._id}`}
              ref={el => { if (el) panelRefs.current[i] = el }}
              onMouseEnter={entered && !isMobile ? () => setFocusedPanel(i) : undefined}
              onClick={isMobile
                ? () => { if (isActive) handleClick(project); else setFocusedPanel(i) }
                : () => handleClick(project)}
              style={{
                position:   'absolute',
                top:        0,
                left,
                width,
                height:     '100%',
                overflow:   'hidden',
                cursor:     'pointer',
                // CSS transitions only active after entrance so GSAP isn't fighting them
                transition: entered
                  ? 'left 0.5s cubic-bezier(0.4,0,0.2,1), width 0.5s cubic-bezier(0.4,0,0.2,1)'
                  : 'none',
              }}
            >
              {hasImage && (
                <img
                  src={imageUrl(project.coverImage.asset._ref)}
                  alt={project.title}
                  draggable={false}
                  style={{
                    width:      '100%',
                    height:     '100%',
                    objectFit:  'cover',
                    display:    'block',
                    userSelect: 'none',
                    filter:     isActive ? 'none' : 'brightness(0.3) grayscale(60%)',
                    transition: 'filter 0.5s ease',
                  }}
                />
              )}

              {isActive && (
                <>
                  <div style={{
                    position:      'absolute',
                    inset:         0,
                    background:    'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 52%)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position:      'absolute',
                    bottom:        0,
                    left:          0,
                    right:         0,
                    padding:       '24px 18px 20px',
                    pointerEvents: 'none',
                  }}>
                    <p style={{
                      fontFamily:   mono,
                      fontSize:     'clamp(0.78rem, 1.2vw, 1rem)',
                      fontStyle:    'italic',
                      fontWeight:   300,
                      color:        '#ffffff',
                      margin:       0,
                      marginBottom: 5,
                      whiteSpace:   'nowrap',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {project.title}
                    </p>
                    {project.year && (
                      <p style={{
                        fontFamily:    mono,
                        fontSize:      '9px',
                        letterSpacing: '0.35em',
                        textTransform: 'uppercase',
                        color:         '#888',
                        margin:        0,
                      }}>
                        {project.year}
                      </p>
                    )}
                  </div>
                </>
              )}

              {!isActive && (
                <div style={{
                  position:        'absolute',
                  bottom:          24,
                  left:            '50%',
                  transform:       'translateX(-50%) rotate(90deg)',
                  transformOrigin: 'center center',
                  whiteSpace:      'nowrap',
                  pointerEvents:   'none',
                }}>
                  <span style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.3em', color: '#2a2a2a' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
