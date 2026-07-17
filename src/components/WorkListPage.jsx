import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { imageProps } from '../sanityImage'
import { slugify } from '../slug'

const NAV_H  = 'calc(env(safe-area-inset-top, 0px) + 52px)'
const mono   = '"Sequel Sans Heavy Disp"'
// ── Mobile work index: editorial vertical list ─────────────────────────────
// Full-width cover per work with numbered title rows — natural scroll, works
// read as a contact sheet instead of a hidden horizontal pager.

function MobileWorkIndex({ projects, category }) {
  const navigate  = useNavigate()
  const listRef   = useRef(null)
  const labelRef  = useRef(null)
  const n = projects.length

  // Header label masked reveal on mount
  useEffect(() => {
    if (!labelRef.current) return
    gsap.fromTo(labelRef.current,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.9, ease: 'expo.out', delay: 0.15, force3D: true })
  }, [])

  // Rows fade up as they scroll into view — one-shot, same easing family as
  // the rest of the site.
  useEffect(() => {
    const root = listRef.current
    if (!root || !n) return
    const items = root.querySelectorAll('[data-wreveal]')
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return
        gsap.fromTo(en.target,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
        io.unobserve(en.target)
      })
    }, { threshold: 0.08 })
    items.forEach(el => { el.style.opacity = 0; io.observe(el) })
    return () => io.disconnect()
  }, [n])

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100dvh', paddingTop: NAV_H }}>

      {/* Back — fixed under the navbar, same treatment as the work pages */}
      <button
        onClick={() => navigate('/works')}
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

      {/* ── Header ── */}
      <div style={{ padding: '64px 20px 6px' }}>
        <span style={{ display: 'block', fontFamily: mono, fontSize: '9px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#555', marginBottom: '12px' }}>
          Collection {n > 0 && `— ${String(n).padStart(2, '0')} works`}
        </span>
        <div style={{ overflow: 'hidden', lineHeight: 0.88 }}>
          <h1 ref={labelRef} style={{
            display: 'inline-block',
            fontFamily: mono, fontWeight: 900,
            fontSize: 'clamp(3.4rem, 18vw, 6rem)',
            letterSpacing: '0.02em', color: '#ffffff',
            transform: 'translateY(110%)',
            userSelect: 'none',
          }}>
            .{category.toUpperCase()}
          </h1>
        </div>
      </div>

      {n === 0 ? (
        <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#333' }}>
            Loading…
          </span>
        </div>
      ) : (
        <div ref={listRef} style={{ padding: '18px 0 calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          {projects.map((p, i) => (
            <div
              key={p._id}
              data-wreveal
              onClick={() => navigate(`/work/${slugify(p.title)}`)}
              style={{
                cursor: 'pointer',
                marginBottom: '28px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Cover */}
              {p.coverImage?.asset?._ref && (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '3 / 2', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
                  <img
                    {...imageProps(p.coverImage, { widths: [480, 800, 1200], sizes: '100vw' })}
                    alt={p.title}
                    draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 62%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none' }} />
                  <span style={{
                    position: 'absolute', bottom: 12, left: 20,
                    fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em',
                    color: 'rgba(255,255,255,0.6)',
                    textShadow: '0 1px 8px rgba(0,0,0,0.8)',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Title row */}
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px',
                padding: '14px 20px 0',
              }}>
                <span style={{
                  fontFamily: mono, fontWeight: 300,
                  fontSize: 'clamp(1.15rem, 5vw, 1.6rem)',
                  letterSpacing: '-0.01em', lineHeight: 1.15,
                  color: '#ffffff',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.title}
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexShrink: 0 }}>
                  {p.year && (
                    <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', color: '#666' }}>
                      {p.year}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
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

  if (isMobile) return <MobileWorkIndex projects={projects} category={category} />

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
              to={`/work/${slugify(project.title)}`}
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
