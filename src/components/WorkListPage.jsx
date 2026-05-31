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

const STEP_DEG   = 28
const RADIUS     = 140
const PX_PER_DEG = 2.2
const NAV_H      = 'calc(env(safe-area-inset-top, 0px) + 52px)'
const mono       = '"Noto Sans Mono", monospace'

// ── Mobile drum scroll ─────────────────────────────────────────────────────────

function MobileDrumList({ projects, category }) {
  const navigate    = useNavigate()
  const [rotation, setRotation] = useState(0)
  const rotRef      = useRef(0)
  const rafRef      = useRef(null)
  const containerRef = useRef(null)
  const n = projects.length

  const activeIdx     = n > 0 ? Math.max(0, Math.min(n - 1, Math.round(rotation / STEP_DEG))) : 0
  const activeProject = projects[activeIdx]
  const imgProjects   = projects.filter(p => p.coverImage?.asset?._ref)

  const snapTo = useCallback((idx) => {
    const target    = Math.max(0, Math.min(n - 1, idx)) * STEP_DEG
    const startRot  = rotRef.current
    const diff      = target - startRot
    const duration  = 480
    const startTime = performance.now()
    cancelAnimationFrame(rafRef.current)
    const run = (now) => {
      const t      = Math.min(1, (now - startTime) / duration)
      const eased  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const newRot = startRot + diff * eased
      rotRef.current = newRot
      setRotation(newRot)
      if (t < 1) rafRef.current = requestAnimationFrame(run)
    }
    rafRef.current = requestAnimationFrame(run)
  }, [n])

  // Touch events via addEventListener (passive:false needed for preventDefault)
  useEffect(() => {
    const el = containerRef.current
    if (!el || n === 0) return

    let startY = 0, startRot = 0, lastY = 0, lastT = 0, vel = 0

    const onStart = (e) => {
      cancelAnimationFrame(rafRef.current)
      startY    = e.touches[0].clientY
      startRot  = rotRef.current
      lastY     = startY
      lastT     = performance.now()
      vel       = 0
    }

    const onMove = (e) => {
      e.preventDefault()
      const y      = e.touches[0].clientY
      const newRot = Math.max(-STEP_DEG * 0.5, Math.min((n - 0.5) * STEP_DEG, startRot + (startY - y) / PX_PER_DEG))
      rotRef.current = newRot
      setRotation(newRot)
      const now = performance.now()
      if (now > lastT) vel = (lastY - y) / (now - lastT)
      lastY = y
      lastT = now
    }

    const onEnd = () => {
      let v   = vel / PX_PER_DEG
      let rot = rotRef.current
      cancelAnimationFrame(rafRef.current)
      const go = () => {
        v   *= 0.88
        rot += v * 16
        rot  = Math.max(-STEP_DEG * 0.5, Math.min((n - 0.5) * STEP_DEG, rot))
        rotRef.current = rot
        setRotation(rot)
        if (Math.abs(v) > 0.1) {
          rafRef.current = requestAnimationFrame(go)
        } else {
          snapTo(Math.max(0, Math.min(n - 1, Math.round(rot / STEP_DEG))))
        }
      }
      rafRef.current = requestAnimationFrame(go)
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', paddingTop: NAV_H, display: 'flex', overflow: 'hidden' }}>

      {/* Left — drum */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', touchAction: 'none', userSelect: 'none' }}>

        {/* Category label */}
        <div style={{ position: 'absolute', top: 20, left: 20, fontFamily: mono, fontSize: '9px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#333', zIndex: 10 }}>
          .{category}
        </div>

        {/* Center line */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(240,236,230,0.12)', zIndex: 10, pointerEvents: 'none' }} />

        {/* Drum */}
        <div style={{ perspective: '700px', width: '100%', height: '100%', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 0, transformStyle: 'preserve-3d' }}>
            {projects.map((p, i) => {
              let angleDeg = i * STEP_DEG - rotation
              while (angleDeg >  180) angleDeg -= 360
              while (angleDeg < -180) angleDeg += 360
              if (Math.abs(angleDeg) > 86) return null

              const rad      = angleDeg * Math.PI / 180
              const y        = Math.sin(rad) * RADIUS
              const z        = (Math.cos(rad) - 1) * RADIUS
              const opacity  = Math.max(0, Math.cos(rad))
              const isActive = i === activeIdx

              return (
                <div
                  key={p._id}
                  onClick={() => isActive ? navigate(`/work/${p._id}`) : snapTo(i)}
                  style={{
                    position:    'absolute',
                    top: 0, left: 20, right: 8,
                    transform:   `translateY(${y}px) translateZ(${z}px) rotateX(${-angleDeg * 0.55}deg)`,
                    opacity,
                    fontFamily:  mono,
                    fontSize:    isActive ? 'clamp(1.25rem, 5vw, 1.75rem)' : 'clamp(0.9rem, 3.5vw, 1.3rem)',
                    fontStyle:   'italic',
                    fontWeight:  isActive ? 700 : 300,
                    color:       isActive ? '#f0ece6' : '#555',
                    letterSpacing: '-0.02em',
                    lineHeight:  1,
                    userSelect:  'none',
                    cursor:      isActive ? 'pointer' : 'default',
                    willChange:  'transform',
                    whiteSpace:  'nowrap',
                    overflow:    'hidden',
                    textOverflow:'ellipsis',
                  }}
                >
                  {p.title}
                </div>
              )
            })}
          </div>
        </div>

        {/* Counter */}
        <div style={{ position: 'absolute', bottom: 32, left: 20, fontFamily: mono, fontSize: '9px', letterSpacing: '0.3em', color: '#333' }}>
          {String(activeIdx + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </div>
      </div>

      {/* Right — cover image */}
      <div style={{ width: '44%', position: 'relative', overflow: 'hidden' }}>
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
              transition: 'opacity 0.55s ease-in-out',
            }}
          />
        ))}
        {/* Left fade so the drum text reads over it */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #000 0%, transparent 40%)', pointerEvents: 'none' }} />
      </div>

    </div>
  )
}

// ── Desktop list (unchanged) ───────────────────────────────────────────────────

export default function WorkListPage({ category }) {
  const isMobile              = useIsMobile()
  const [projects, setProjects] = useState([])
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
        <h1 className="font-serif text-[#1a1a1a] text-6xl font-light italic tracking-tight">
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
                  className="font-serif text-[#1a1a1a] font-light italic group-hover:text-[#888] transition-colors duration-300"
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
          <img src={imageUrl(hovered.coverImage.asset._ref)} alt={hovered.title} style={{ width: 260, height: 174, objectFit: 'cover', display: 'block' }} />
        )}
      </div>
    </section>
  )
}
