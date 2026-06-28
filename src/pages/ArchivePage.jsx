import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../sanityClient'

const mono = '"Noto Sans Mono", monospace'

const PANEL_COLLAPSED  = 20
const PANEL_EXPANDED   = 380
const PANEL_EXPANDED_M = 220
const PANEL_GAP        = 4
const BREAKPOINT       = 768

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

export default function ArchivePage() {
  const [projects,      setProjects]      = useState([])
  const [focusedPanel,  setFocusedPanel]  = useState(0)
  const [trackWidth,    setTrackWidth]    = useState(0)
  const [isMobile,      setIsMobile]      = useState(false)
  const trackRef = useRef(null)
  const navigate = useNavigate()

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

  // Reset focus when project count changes
  useEffect(() => { setFocusedPanel(0) }, [projects.length])

  const expandedW = isMobile ? PANEL_EXPANDED_M : PANEL_EXPANDED

  const getPanelPos = useCallback((idx) => {
    const n = projects.length
    if (!n || !trackWidth) return { left: 0, width: PANEL_COLLAPSED }
    const totalW  = (n - 1) * (PANEL_COLLAPSED + PANEL_GAP) + expandedW
    const offset  = Math.max(0, (trackWidth - totalW) / 2)
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
    <section style={{ backgroundColor: '#000', minHeight: '100vh', padding: '112px 0 96px' }}>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 64, padding: '0 48px' }}>
        <h1 style={{
          fontFamily:    '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace',
          fontSize:      'clamp(2.5rem, 18vw, 10rem)',
          fontWeight:    900,
          lineHeight:    0.88,
          letterSpacing: '0',
          color:         '#f0ece6',
          userSelect:    'none',
        }}>
          ARCHIVE
        </h1>
      </div>

      {/* Accordion panels — trackRef must always be in the DOM so ResizeObserver attaches on mount */}
      <div
        ref={trackRef}
        style={{ position: 'relative', height: '65vh', overflow: 'hidden' }}
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
                onClick={isMobile ? () => {
                  if (isActive) handleClick(project)
                  else setFocusedPanel(i)
                } : () => handleClick(project)}
                style={{
                  position:   'absolute',
                  top:        0,
                  left,
                  width,
                  height:     '100%',
                  overflow:   'hidden',
                  cursor:     'pointer',
                  transition: 'left 0.55s cubic-bezier(0.4,0,0.2,1), width 0.55s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                {/* Cover image */}
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
                      filter:     isActive ? 'none' : 'brightness(0.35) grayscale(55%)',
                      transition: 'filter 0.55s ease',
                    }}
                  />
                )}

                {/* Gradient + info overlay — active panel only */}
                <div style={{
                  position:   'absolute',
                  inset:      0,
                  background: isActive
                    ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 55%)'
                    : 'none',
                  transition: 'background 0.4s ease',
                  pointerEvents: 'none',
                }} />

                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom:   0,
                    left:     0,
                    right:    0,
                    padding:  '28px 22px 24px',
                    pointerEvents: 'none',
                  }}>
                    <p style={{
                      fontFamily:    mono,
                      fontSize:      'clamp(0.82rem, 1.3vw, 1.1rem)',
                      fontStyle:     'italic',
                      fontWeight:    300,
                      color:         '#f0ece6',
                      margin:        0,
                      marginBottom:  6,
                      whiteSpace:    'nowrap',
                      overflow:      'hidden',
                      textOverflow:  'ellipsis',
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
                )}

                {/* Vertical index — collapsed panels */}
                {!isActive && (
                  <div style={{
                    position:        'absolute',
                    bottom:          28,
                    left:            '50%',
                    transform:       'translateX(-50%) rotate(90deg)',
                    transformOrigin: 'center center',
                    whiteSpace:      'nowrap',
                    pointerEvents:   'none',
                  }}>
                    <span style={{
                      fontFamily:    mono,
                      fontSize:      '8px',
                      letterSpacing: '0.3em',
                      color:         '#2a2a2a',
                    }}>
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
