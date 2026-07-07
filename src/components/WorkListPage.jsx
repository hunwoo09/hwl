import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { imageProps } from '../sanityImage'

const NAV_H  = 'calc(env(safe-area-inset-top, 0px) + 52px)'
const mono   = '"Sequel Sans Heavy Disp"'
const CARD_W = 78 // vw — width of each filmstrip card
const GAP    = 14 // px — gap between cards

// ── Mobile filmstrip ────────────────────────────────────────────────────────────

function MobileFilmstrip({ projects, category }) {
  const navigate     = useNavigate()
  const scrollerRef  = useRef(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const n = projects.length
  const activeProject = projects[activeIdx]

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let raf = null
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const cardW = el.clientWidth * (CARD_W / 100) + GAP
        const idx   = Math.round(el.scrollLeft / cardW)
        setActiveIdx(Math.max(0, Math.min(n - 1, idx)))
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', onScroll) }
  }, [n])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#000000',
      paddingTop: NAV_H,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Category label */}
      <span style={{
        position: 'absolute', top: `calc(${NAV_H} + 20px)`, left: 20, zIndex: 2,
        fontFamily: mono, fontSize: '9px', letterSpacing: '0.42em',
        textTransform: 'uppercase', color: '#444',
      }}>
        .{category}
      </span>

      {n === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#333' }}>
            Loading…
          </span>
        </div>
      ) : (
        <>
          {/* Snap-scroll card row */}
          <div
            ref={scrollerRef}
            className="no-scrollbar"
            style={{
              flex:              1,
              display:           'flex',
              alignItems:        'center',
              gap:               `${GAP}px`,
              overflowX:         'auto',
              scrollSnapType:    'x mandatory',
              WebkitOverflowScrolling: 'touch',
              padding:           `0 ${(100 - CARD_W) / 2}vw`,
            }}
          >
            {projects.map((p, i) => {
              const isActive = i === activeIdx
              return (
                <div
                  key={p._id}
                  onClick={(e) => {
                    if (isActive) { navigate(`/work/${p._id}`); return }
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
                  }}
                  style={{
                    flex:           `0 0 ${CARD_W}vw`,
                    scrollSnapAlign: 'center',
                    aspectRatio:    '4 / 5',
                    position:       'relative',
                    overflow:       'hidden',
                    backgroundColor: '#0a0a0a',
                    userSelect:     'none',
                    WebkitTapHighlightColor: 'transparent',
                    cursor:         'pointer',
                  }}
                >
                  {p.coverImage?.asset?._ref && (
                    <img
                      {...imageProps(p.coverImage, { widths: [400, 700, 1000], sizes: '78vw' })}
                      alt={p.title}
                      draggable={false}
                      style={{
                        position:   'absolute', inset: 0,
                        width:      '100%', height: '100%', objectFit: 'cover',
                        filter:     isActive ? 'none' : 'grayscale(70%) brightness(0.55)',
                        transform:  isActive ? 'scale(1)' : 'scale(0.96)',
                        transition: 'filter 0.4s ease, transform 0.4s ease',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Title + counter */}
          <div style={{ padding: '20px 20px calc(28px + env(safe-area-inset-bottom, 0px))' }}>
            <h2 style={{
              fontFamily:    mono, fontWeight: 900,
              fontSize:      'clamp(1.6rem, 7.5vw, 2.4rem)',
              lineHeight:    1, color: '#ffffff', marginBottom: 10,
              whiteSpace:    'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {activeProject?.title}
            </h2>
            <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em', color: '#444' }}>
              {String(activeIdx + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Desktop list (unchanged) ───────────────────────────────────────────────────

export default function WorkListPage({ category }) {
  const isMobile                  = useIsMobile()
  const [projects, setProjects]   = useState([])
  const [hoveredId, setHoveredId] = useState(null)
  const [mousePos, setMousePos]   = useState({ x: 0, y: 0 })
  const headingRef = useRef(null)
  const listRef    = useRef(null)

  useEffect(() => {
    client
      .fetch(
        `*[_type == "project" && (category == $cat || category == $dotcat)] | order(orderRank asc, _createdAt desc)`,
        { cat: category, dotcat: '.' + category }
      )
      .then(setProjects)
  }, [category])

  useEffect(() => {
    if (!listRef.current || projects.length === 0) return
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
    gsap.fromTo(Array.from(listRef.current.children),
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.15,
        clearProps: 'opacity,transform' }
    )
  }, [projects])

  if (isMobile) return <MobileFilmstrip projects={projects} category={category} />

  const hovered = projects.find(p => p._id === hoveredId)

  return (
    <section
      className="min-h-screen px-10 pt-28 pb-24 bg-cream"
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <div ref={headingRef} className="mb-14" style={{ opacity: 0 }}>
        <p className="font-sans text-[#aaa] text-[10px] tracking-[0.4em] uppercase mb-3">Collection</p>
        <h1 className="font-serif text-[#1a1a1a] text-6xl font-light tracking-tight">
          .{category}
        </h1>
      </div>

      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="font-sans text-[#ccc] text-[10px] tracking-[0.4em] uppercase">No projects yet</p>
        </div>
      ) : (
        <div ref={listRef} className="border-t border-[#e0dbd5]">
          {projects.map((project, i) => (
            <Link
              key={project._id}
              to={`/work/${project._id}`}
              className="group flex items-baseline justify-between border-b border-[#e0dbd5] py-6 transition-all duration-300"
              style={{ opacity: 0 }}
              onMouseEnter={() => setHoveredId(project._id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex items-baseline gap-8">
                <span className="font-sans text-[#ccc] text-[10px] tracking-widest w-6 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-serif text-[#1a1a1a] font-light group-hover:text-[#888] transition-colors duration-300"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)', letterSpacing: '-0.02em', lineHeight: 1 }}
                >
                  {project.title}
                </span>
              </div>
              <div className="flex items-center gap-6 shrink-0 ml-8">
                {project.medium && (
                  <span className="font-sans text-[#aaa] text-[10px] tracking-[0.25em] uppercase hidden md:block">
                    {project.medium}
                  </span>
                )}
                {project.year && (
                  <span className="font-sans text-[#ccc] text-[10px] tracking-widest">{project.year}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <div
        className="fixed pointer-events-none z-50"
        style={{ left: mousePos.x + 28, top: mousePos.y - 110, opacity: hovered?.coverImage ? 1 : 0, transition: 'opacity 0.18s ease' }}
      >
        {hovered?.coverImage && (
          <img {...imageProps(hovered.coverImage, { widths: [260, 520], sizes: '260px' })} alt={hovered.title}
            style={{ width: 260, height: 174, objectFit: 'cover', display: 'block' }} />
        )}
      </div>
    </section>
  )
}
