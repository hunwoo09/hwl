import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { client } from '../sanityClient'

const mono = '"Noto Sans Mono", monospace'

const PANEL_COLLAPSED  = 18
const PANEL_EXPANDED   = 340   // also the track height → square panels
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
  const [entered,      setEntered]      = useState(false)
  const trackRef = useRef(null)
  const navigate = useNavigate()

  // Block page scroll while on archive
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

  // trackRef is always mounted so ResizeObserver attaches on load
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => {
      setTrackWidth(entry.contentRect.width)
      setIsMobile(window.innerWidth < BREAKPOINT)
    })
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { setFocusedPanel(null) }, [projects.length])

  // Trigger entrance after projects + layout are ready
  useEffect(() => {
    if (!projects.length || !trackWidth) return
    const t = setTimeout(() => setEntered(true), 40)
    return () => clearTimeout(t)
  }, [projects.length, trackWidth])

  const expandedW = isMobile ? PANEL_EXPANDED_M : PANEL_EXPANDED
  const trackH    = isMobile ? PANEL_EXPANDED_M : PANEL_EXPANDED

  const getPanelPos = useCallback((idx) => {
    const n = projects.length
    if (!n || !trackWidth) return { left: 0, width: PANEL_COLLAPSED }
    // When nothing is focused all panels are collapsed
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
      paddingTop:      72,   // clear the navbar
    }}>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily:    '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace',
          fontSize:      'clamp(2.5rem, 14vw, 8rem)',
          fontWeight:    900,
          lineHeight:    0.88,
          letterSpacing: '0',
          color:         '#f0ece6',
          userSelect:    'none',
          flexShrink:    0,
        }}
      >
        ARCHIVE
      </motion.h1>

      {/* Accordion track — always mounted so ResizeObserver works */}
      <div
        ref={trackRef}
        onMouseLeave={() => setFocusedPanel(null)}
        style={{
          position: 'relative',
          width:    '100%',
          height:   `${trackH}px`,
          flexShrink: 0,
        }}
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
              onMouseEnter={!isMobile ? () => setFocusedPanel(i) : undefined}
              onClick={isMobile
                ? () => { if (isActive) handleClick(project); else setFocusedPanel(i) }
                : () => handleClick(project)}
              style={{
                position:   'absolute',
                top:        0,
                left,
                width:      entered ? width : 0,
                opacity:    entered ? 1 : 0,
                height:     '100%',
                overflow:   'hidden',
                cursor:     'pointer',
                transition: entered
                  ? 'left 0.5s cubic-bezier(0.4,0,0.2,1), width 0.5s cubic-bezier(0.4,0,0.2,1)'
                  : `width 0.8s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.05}s, opacity 0.5s ease ${0.3 + i * 0.05}s`,
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

              {/* Gradient + label — active panel only */}
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
                      color:        '#f0ece6',
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

              {/* Vertical index on collapsed panels */}
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
