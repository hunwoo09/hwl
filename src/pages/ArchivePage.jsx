import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

const mono = '"Noto Sans Mono", monospace'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

// Build alternating groups: [full-width, 2-col, full-width, 2-col, …]
function buildGroups(projects) {
  const groups = []
  let i = 0
  while (i < projects.length) {
    const isDouble = groups.length % 2 === 1
    if (isDouble && i + 1 < projects.length) {
      groups.push({ type: 'double', items: [projects[i], projects[i + 1]] })
      i += 2
    } else {
      groups.push({ type: 'full', items: [projects[i]] })
      i += 1
    }
  }
  return groups
}

export default function ArchivePage() {
  const [projects, setProjects] = useState([])
  const navigate   = useNavigate()
  const headingRef = useRef(null)

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && (category == "archive" || category == ".archive")] | order(orderRank asc, _createdAt desc)`)
      .then(setProjects)
  }, [])

  // Entrance animation — runs once projects arrive
  useEffect(() => {
    if (!projects.length || !headingRef.current) return
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
    const items = document.querySelectorAll('.arc-editorial-item')
    if (items.length) {
      gsap.fromTo(items,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.07, delay: 0.15 }
      )
    }
  }, [projects])

  // Shared element transition → WorkPage via View Transitions API
  const handleClick = useCallback((e, project, containerEl) => {
    e.preventDefault()
    const ref = project?.coverImage?.asset?._ref
    if (!containerEl || !ref) { navigate(`/work/${project._id}`); return }

    // Store image URL so WorkPage can render a named placeholder while loading
    sessionStorage.setItem('archive-vt', JSON.stringify({
      projectId: project._id,
      url: imageUrl(ref),
    }))

    // Tag this element as the transition source (browser captures it in old state)
    containerEl.style.viewTransitionName = 'project-hero'

    // React Router wraps the navigation in document.startViewTransition
    navigate(`/work/${project._id}`, { viewTransition: true })
  }, [navigate])

  const groups = buildGroups(projects)

  return (
    <section style={{ backgroundColor: '#000', minHeight: '100vh', padding: '112px 48px 96px' }}>

      {/* Heading */}
      <div ref={headingRef} style={{ opacity: 0, textAlign: 'center', marginBottom: 72 }}>
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

      {/* Editorial grid */}
      {projects.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <p style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#333' }}>
            Loading
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 72 }}>
          {groups.map((group, gi) =>
            group.type === 'full' ? (
              <FullItem
                key={group.items[0]._id}
                project={group.items[0]}
                onItemClick={handleClick}
              />
            ) : (
              <div key={gi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                {group.items.map(p => (
                  <DoubleItem key={p._id} project={p} onItemClick={handleClick} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </section>
  )
}

// ── Full-width item ────────────────────────────────────────────────────────────
function FullItem({ project, onItemClick }) {
  return (
    <div className="arc-editorial-item" style={{ opacity: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {project.coverImage?.asset?._ref && (
        <div
          style={{ width: '55%', aspectRatio: '3/2', overflow: 'hidden', cursor: 'pointer' }}
          onClick={e => onItemClick(e, project, e.currentTarget)}
        >
          <img
            src={imageUrl(project.coverImage.asset._ref)}
            alt={project.title}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <div style={{ width: project.coverImage?.asset?._ref ? '55%' : '100%' }}>
        <ItemText project={project} large />
      </div>
    </div>
  )
}

// ── 2-column item ─────────────────────────────────────────────────────────────
function DoubleItem({ project, onItemClick }) {
  return (
    <div className="arc-editorial-item" style={{ opacity: 0 }}>
      {project.coverImage?.asset?._ref && (
        <div
          style={{ aspectRatio: '4/3', overflow: 'hidden', cursor: 'pointer' }}
          onClick={e => onItemClick(e, project, e.currentTarget)}
        >
          <img
            src={imageUrl(project.coverImage.asset._ref)}
            alt={project.title}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
      <ItemText project={project} large={false} />
    </div>
  )
}

// ── Text below each photo ─────────────────────────────────────────────────────
function ItemText({ project, large }) {
  return (
    <div style={{ marginTop: large ? 18 : 14, maxWidth: large ? 680 : '100%' }}>
      <p style={{
        fontFamily:    mono,
        fontSize:      large ? 'clamp(1rem, 2vw, 1.35rem)' : 'clamp(0.85rem, 1.4vw, 1.05rem)',
        fontWeight:    300,
        fontStyle:     'italic',
        letterSpacing: '-0.01em',
        color:         '#f0ece6',
        margin:        0,
        marginBottom:  8,
      }}>
        {project.title}
      </p>

      {project.year && (
        <p style={{
          fontFamily:    mono,
          fontSize:      '9px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color:         '#444',
          margin:        0,
          marginBottom:  project.description ? 10 : 0,
        }}>
          {project.year}
        </p>
      )}

      {project.description && (
        <p style={{
          fontFamily:            mono,
          fontSize:              '11px',
          fontWeight:            300,
          lineHeight:            1.85,
          color:                 '#555',
          margin:                0,
          display:               '-webkit-box',
          WebkitLineClamp:       large ? 3 : 2,
          WebkitBoxOrient:       'vertical',
          overflow:              'hidden',
        }}>
          {project.description}
        </p>
      )}
    </div>
  )
}
