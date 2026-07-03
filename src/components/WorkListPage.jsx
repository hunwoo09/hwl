import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

const STEP_DEG   = 26       // degrees between items on the wheel
const RADIUS     = 150      // px — cylinder radius (controls spread)
const PX_PER_DEG = 2.4      // drag pixels per degree of rotation
const NAV_H      = 'calc(env(safe-area-inset-top, 0px) + 52px)'
const mono       = '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace'

// ── Mobile drum scroll ─────────────────────────────────────────────────────────

function MobileDrumList({ projects, category }) {
  const navigate   = useNavigate()
  // rotation in degrees — drives all item positions
  const [rotation, setRotation] = useState(0)
  const rotRef     = useRef(0)
  const rafRef     = useRef(null)
  const containerRef = useRef(null)
  const n = projects.length

  const activeIdx = n > 0
    ? Math.max(0, Math.min(n - 1, Math.round(rotation / STEP_DEG)))
    : 0
  const activeProject = projects[activeIdx]
  const imgProjects   = projects.filter(p => p.coverImage?.asset?._ref)

  // Smooth snap to an item index
  const snapTo = useCallback((idx) => {
    const target    = Math.max(0, Math.min(n - 1, idx)) * STEP_DEG
    const from      = rotRef.current
    const dist      = target - from
    const dur       = 500
    const t0        = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (now) => {
      const p      = Math.min(1, (now - t0) / dur)
      const eased  = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      const r      = from + dist * eased
      rotRef.current = r
      setRotation(r)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [n])

  // Attach non-passive touch listeners so we can preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el || n === 0) return

    let sy = 0, sr = 0, ly = 0, lt = 0, vel = 0

    const onStart = (e) => {
      cancelAnimationFrame(rafRef.current)
      sy  = e.touches[0].clientY
      sr  = rotRef.current
      ly  = sy
      lt  = performance.now()
      vel = 0
    }
    const onMove = (e) => {
      e.preventDefault()
      const y   = e.touches[0].clientY
      const rot = Math.max(-STEP_DEG * 0.4, Math.min((n - 0.6) * STEP_DEG, sr + (sy - y) / PX_PER_DEG))
      rotRef.current = rot
      setRotation(rot)
      const now = performance.now()
      if (now > lt) vel = (ly - y) / (now - lt)
      ly = y; lt = now
    }
    const onEnd = () => {
      let v = vel / PX_PER_DEG
      let r = rotRef.current
      cancelAnimationFrame(rafRef.current)
      const coast = () => {
        v   *= 0.88
        r   += v * 16
        r    = Math.max(-STEP_DEG * 0.4, Math.min((n - 0.6) * STEP_DEG, r))
        rotRef.current = r
        setRotation(r)
        if (Math.abs(v) > 0.1) rafRef.current = requestAnimationFrame(coast)
        else snapTo(Math.max(0, Math.min(n - 1, Math.round(r / STEP_DEG))))
      }
      rafRef.current = requestAnimationFrame(coast)
    }

    el.addEventListener('touchstart', onStart, { passive: true  })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true  })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [n, snapTo])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#000000',
      paddingTop: NAV_H,
      display: 'flex',
    }}>

      {/* ── Left: drum ── */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', touchAction: 'none', userSelect: 'none' }}
      >
        {/* Category label */}
        <span style={{
          position: 'absolute', top: 20, left: 20, zIndex: 2,
          fontFamily: mono, fontSize: '9px', letterSpacing: '0.42em',
          textTransform: 'uppercase', color: '#444',
        }}>
          .{category}
        </span>

        {/* Center line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '50%',
          height: 1, background: 'rgba(255,255,255,0.14)', zIndex: 2,
          pointerEvents: 'none',
        }} />

        {/* Items — each positioned directly via top: calc(50% + Ypx) */}
        {projects.map((p, i) => {
          let deg = i * STEP_DEG - rotation
          while (deg >  180) deg -= 360
          while (deg < -180) deg += 360
          if (Math.abs(deg) > 88) return null

          const rad      = deg * Math.PI / 180
          const y        = Math.sin(rad) * RADIUS
          const scale    = Math.max(0.01, Math.cos(rad))
          const opacity  = Math.max(0, Math.cos(rad))
          const isActive = i === activeIdx

          return (
            <div
              key={p._id}
              onClick={() => isActive ? navigate(`/work/${p._id}`) : snapTo(i)}
              style={{
                position:      'absolute',
                top:           `calc(50% + ${y}px)`,
                left:          20,
                right:         8,
                transform:     `translateY(-50%) scale(${scale}) skewX(${-deg * 0.3}deg)`,
                transformOrigin: 'left center',
                opacity,
                fontFamily:    mono,
                fontSize:      isActive
                  ? 'clamp(1.2rem, 5.5vw, 1.7rem)'
                  : 'clamp(0.85rem, 3.5vw, 1.2rem)',
                fontStyle:     'normal',
                fontWeight:    isActive ? 700 : 300,
                color:         isActive ? '#ffffff' : '#555',
                letterSpacing: '-0.02em',
                lineHeight:    1.3,
                whiteSpace:    'nowrap',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                userSelect:    'none',
                cursor:        isActive ? 'pointer' : 'default',
                willChange:    'transform, opacity',
              }}
            >
              {p.title}
            </div>
          )
        })}

        {/* Counter */}
        {n > 0 && (
          <span style={{
            position: 'absolute', bottom: 32, left: 20, zIndex: 2,
            fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em', color: '#333',
          }}>
            {String(activeIdx + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
          </span>
        )}

        {/* Loading hint */}
        {n === 0 && (
          <span style={{
            position: 'absolute', top: '50%', left: 20,
            fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em',
            textTransform: 'uppercase', color: '#333',
          }}>
            Loading…
          </span>
        )}
      </div>

      {/* ── Right: cover image ── */}
      <div style={{ width: '42%', position: 'relative' }}>
        {imgProjects.map(p => (
          <img
            key={p._id}
            src={imageUrl(p.coverImage.asset._ref)}
            alt={p.title}
            draggable={false}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity:    p._id === activeProject?._id ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
            }}
          />
        ))}
        {/* Fade left edge so drum text reads cleanly */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, #000 0%, transparent 45%)',
          pointerEvents: 'none',
        }} />
      </div>

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

  if (isMobile) return <MobileDrumList projects={projects} category={category} />

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
          <img src={imageUrl(hovered.coverImage.asset._ref)} alt={hovered.title}
            style={{ width: 260, height: 174, objectFit: 'cover', display: 'block' }} />
        )}
      </div>
    </section>
  )
}
