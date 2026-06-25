import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

// Relative flex widths per column position — 5 items per row
// Row A: one skinny, four varying
// Row B: different rhythm
// Row C: slight variation
const ROW_PATTERNS = [
  [1, 1.9, 2.6, 2, 2.5],
  [1.4, 2.4, 1.8, 2.6, 1.8],
  [2, 1.6, 2.6, 1.9, 1.9],
]

const ITEMS_PER_ROW = 5
const GAP = 8   // px between cells
const SCALE_IN  = 1.16
const SCALE_OUT = 0.93
const DUR_IN    = 0.55
const DUR_OUT   = 0.42

export default function ArchivePage() {
  const [projects, setProjects] = useState([])
  const headingRef = useRef(null)
  const gridRef    = useRef(null)

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && (category == "archive" || category == ".archive")] | order(orderRank asc, _createdAt desc)`)
      .then(setProjects)
  }, [])

  // Entrance animation
  useEffect(() => {
    if (!headingRef.current || projects.length === 0) return

    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )

    const items = gridRef.current?.querySelectorAll('.arc-item')
    if (items?.length) {
      gsap.fromTo(items,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          stagger: 0.04,
          duration: 0.7,
          ease: 'power3.out',
          delay: 0.15,
          clearProps: 'opacity,transform',
        }
      )
    }
  }, [projects])

  const onEnter = (e) => {
    const item = e.currentTarget
    const all  = [...(gridRef.current?.querySelectorAll('.arc-item') ?? [])]
    const rest = all.filter(el => el !== item)

    gsap.killTweensOf(all)

    gsap.to(item, {
      scale: SCALE_IN,
      zIndex: 20,
      duration: DUR_IN,
      ease: 'power3.out',
      overwrite: 'auto',
    })
    gsap.to(rest, {
      scale: SCALE_OUT,
      opacity: 0.5,
      duration: DUR_IN,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  const onLeave = () => {
    const all = [...(gridRef.current?.querySelectorAll('.arc-item') ?? [])]
    gsap.killTweensOf(all)
    gsap.to(all, {
      scale: 1,
      opacity: 1,
      zIndex: 1,
      duration: DUR_OUT,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  // Split into rows
  const rows = []
  for (let i = 0; i < projects.length; i += ITEMS_PER_ROW) {
    rows.push(projects.slice(i, i + ITEMS_PER_ROW))
  }

  return (
    <section
      className="min-h-screen px-10 pt-28 pb-24"
      style={{ backgroundColor: '#000' }}
    >
      {/* Heading */}
      <div ref={headingRef} className="mb-12 text-center" style={{ opacity: 0 }}>
        <h1 className="font-serif text-[#f0ece6] text-6xl font-bold italic tracking-tight">
          Archive
        </h1>
      </div>

      {/* Grid */}
      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="font-sans text-[#555] text-[10px] tracking-[0.4em] uppercase">Loading</p>
        </div>
      ) : (
        <div ref={gridRef} style={{ display: 'flex', flexDirection: 'column', gap: GAP + 'px' }}>
          {rows.map((row, rowIdx) => {
            const pattern = ROW_PATTERNS[rowIdx % ROW_PATTERNS.length]
            const totalFlex = pattern.reduce((s, v) => s + v, 0)

            return (
              <div
                key={rowIdx}
                style={{ display: 'flex', gap: GAP + 'px', alignItems: 'stretch' }}
              >
                {row.map((project, colIdx) => {
                  const flexVal = pattern[colIdx] ?? 2
                  // Last row: fixed width so items don't stretch across full width
                  const isLastRow = rowIdx === rows.length - 1 && row.length < ITEMS_PER_ROW
                  const widthPct  = `calc(${(flexVal / totalFlex * 100).toFixed(3)}% - ${GAP}px)`

                  return (
                    <Link
                      key={project._id}
                      to={`/work/${project._id}`}
                      className="arc-item"
                      style={{
                        flex: isLastRow ? `0 0 ${widthPct}` : flexVal,
                        position: 'relative',
                        zIndex: 1,
                        display: 'block',
                        transformOrigin: 'center center',
                        willChange: 'transform, opacity',
                      }}
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeave}
                    >
                      {/* Image cell */}
                      <div style={{
                        aspectRatio: '1 / 1',
                        overflow: 'hidden',
                        backgroundColor: '#0a0a0a',
                      }}>
                        {project.coverImage && (
                          <img
                            src={imageUrl(project.coverImage.asset._ref)}
                            alt={project.title}
                            draggable={false}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div style={{ marginTop: '7px', paddingLeft: '1px' }}>
                        <p style={{
                          color: '#d8d4ce',
                          fontFamily: '"Noto Sans Mono", monospace',
                          fontSize: '11px',
                          fontWeight: 300,
                          margin: 0,
                          letterSpacing: '-0.01em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {project.title}
                        </p>
                        {project.location && (
                          <p style={{
                            color: '#444',
                            fontFamily: '"Noto Sans Mono", monospace',
                            fontSize: '7.5px',
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase',
                            marginTop: '3px',
                            marginBottom: 0,
                          }}>
                            {project.location}
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
