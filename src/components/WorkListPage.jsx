import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

export default function WorkListPage({ category }) {
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

      {/* Floating hover preview */}
      <div
        className="fixed pointer-events-none z-50"
        style={{
          left: mousePos.x + 28,
          top: mousePos.y - 110,
          opacity: hovered?.coverImage ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        {hovered?.coverImage && (
          <img
            src={imageUrl(hovered.coverImage.asset._ref)}
            alt={hovered.title}
            style={{ width: 260, height: 174, objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>
    </section>
  )
}
