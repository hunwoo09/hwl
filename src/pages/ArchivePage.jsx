import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { transitionState } from '../transitionState'
import { useIsMobile } from '../hooks/useIsMobile'
import { imageProps } from '../sanityImage'

const monoDisp = '"Sequel Sans Heavy Disp"'

export default function ArchivePage() {
  const [projects, setProjects] = useState([])
  const isMobile = useIsMobile(768)

  const sectionRef       = useRef(null)
  const letterRefs       = useRef([])
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

  // Grid entrance — boxes slide up into place, labels reveal through a clip mask
  useEffect(() => {
    if (!projects.length || entranceStarted.current) return
    entranceStarted.current = true

    const boxes  = boxRefs.current.filter(Boolean)
    const labels = labelRefs.current.filter(Boolean)
    if (!boxes.length) return

    gsap.set(boxes,  { yPercent: 100, opacity: 0, force3D: true })
    gsap.set(labels, { yPercent: 110, force3D: true })

    const tl = gsap.timeline({ delay: 0.75 })
    tl.to(boxes, {
      yPercent:   0,
      opacity:    1,
      duration:   0.75,
      ease:       'power3.out',
      clearProps: 'transform,opacity,willChange',
    })
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
        .archive-card img { transition: filter 0.4s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1); }
        @media (hover: hover) {
          .archive-card:hover img { filter: none; transform: scale(1.045); }
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
            return (
              <div
                key={project._id}
                className="archive-card"
                onClick={() => handleClick(project)}
                style={{ cursor: 'pointer' }}
              >
                <div
                  ref={el => { boxRefs.current[i] = el }}
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
