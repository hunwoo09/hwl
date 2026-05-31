import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'

const CATEGORIES = [
  { slug: 'jpg', label: '.JPG', index: '00—1', description: 'Photography & Images' },
  { slug: 'mp4', label: '.MP4', index: '00—2', description: 'Video & Motion'       },
  { slug: 'obj', label: '.OBJ', index: '00—3', description: '3D & Objects'         },
]

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

function CategoryPanel({ slug, label, index, description, isExpanded, isOther, isLast, onEnter, onLeave }) {
  const [projects,   setProjects]   = useState([])
  const [hoveredId,  setHoveredId]  = useState(null)
  const [cycleIdx,   setCycleIdx]   = useState(0)

  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc)
        { _id, title, year, medium, coverImage }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    if (!isExpanded || hoveredId || imgProjects.length <= 1) return
    const t = setInterval(
      () => setCycleIdx(i => (i + 1) % imgProjects.length),
      2400
    )
    return () => clearInterval(t)
  }, [isExpanded, hoveredId, imgProjects.length])

  useEffect(() => {
    if (!isExpanded) setCycleIdx(0)
  }, [isExpanded])

  const activeId = hoveredId ?? imgProjects[cycleIdx % Math.max(imgProjects.length, 1)]?._id

  const handleLeave = () => { onLeave(); setHoveredId(null) }

  return (
    <div
      onMouseLeave={handleLeave}
      style={{
        flex:           isExpanded ? 3.2 : isOther ? 0.42 : 1,
        height:         '100%',
        borderRight:    'none',
        display:        'flex',
        flexDirection:  'column',
        padding:        '80px 0 44px',
        overflow:       'hidden',
        transition:     'flex 0.72s cubic-bezier(0.4, 0, 0.2, 1)',
        containerType:  'inline-size',
        cursor:         'none',
        position:       'relative',
      }}
    >
      {!isLast && (
        <div style={{
          position:      'absolute',
          right:         0,
          top:           '8%',
          bottom:        '8%',
          width:         1,
          background:    isExpanded
            ? 'linear-gradient(to bottom, transparent, rgba(240,236,230,0.22) 25%, rgba(240,236,230,0.22) 75%, transparent)'
            : 'linear-gradient(to bottom, transparent, rgba(240,236,230,0.07) 25%, rgba(240,236,230,0.07) 75%, transparent)',
          transition:    'background 0.55s ease',
          pointerEvents: 'none',
          zIndex:        2,
        }} />
      )}

      <div
        onMouseEnter={handleLeave}
        style={{
          padding:      '0 32px',
          flexShrink:   0,
          marginBottom: '20px',
          opacity:      isOther ? 0 : 1,
          transition:   'opacity 0.35s ease',
        }}
      >
        <span style={{
          display:       'block',
          fontFamily:    '"Noto Sans Mono", monospace',
          fontSize:      '10px',
          fontWeight:    400,
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color:         isExpanded ? '#f0ece6' : '#bbb',
          whiteSpace:    'nowrap',
          marginBottom:  '10px',
          transform:     isExpanded ? 'translateY(10px)' : 'translateY(30px)',
          transition:    'color 0.4s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {index}
        </span>

        <span style={{
          display:       'block',
          fontFamily:    '"Noto Sans Mono", monospace',
          fontSize:      '10px',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color:         '#666',
          whiteSpace:    'nowrap',
          opacity:       isExpanded ? 1 : 0,
          transform:     isExpanded ? 'translateY(0)' : 'translateY(8px)',
          transition:    'opacity 0.4s ease 0.05s, transform 0.45s cubic-bezier(0.16,1,0.3,1) 0.05s',
        }}>
          {description}
        </span>

        {projects.length > 0 && (
          <span style={{
            display:       'block',
            fontFamily:    '"Noto Sans Mono", monospace',
            fontSize:      '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         '#bbb',
            whiteSpace:    'nowrap',
            marginTop:     '5px',
            opacity:       isExpanded ? 1 : 0,
            transition:    'opacity 0.4s ease 0.1s',
          }}>
            {projects.length} {projects.length === 1 ? 'work' : 'works'}
          </span>
        )}
      </div>

      <div
        onMouseEnter={onEnter}
        style={{
          flex:       1,
          display:    'flex',
          overflow:   'hidden',
          minHeight:  0,
          opacity:    isOther ? 0 : 1,
          transition: 'opacity 0.38s ease',
        }}>

        <div style={{
          width:      isExpanded ? '42%' : '100%',
          flexShrink: 0,
          position:   'relative',
          overflow:   'hidden',
          transition: 'width 0.72s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {imgProjects.map(p => (
            <img
              key={p._id}
              src={imageUrl(p.coverImage.asset._ref)}
              alt={p.title}
              draggable={false}
              style={{
                position:   'absolute',
                inset:       0,
                width:       '100%',
                height:      '100%',
                objectFit:  'cover',
                opacity:    activeId === p._id ? 1 : 0,
                transition: 'opacity 0.65s ease, filter 0.55s ease',
                filter:     hoveredId === p._id ? 'grayscale(0%)' : 'grayscale(100%)',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          ))}

          <div style={{
            position:      'absolute',
            right:          0, top: 0, bottom: 0,
            width:          '60%',
            background:    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.75) 68%, #000000 100%)',
            opacity:        isExpanded ? 1 : 0,
            transition:    'opacity 0.6s ease',
            pointerEvents: 'none',
          }} />
        </div>

        <div
          className="no-scrollbar"
          style={{
            flex:        1,
            overflowY:   'auto',
            padding:     '0 32px 0 20px',
            opacity:     isExpanded ? 1 : 0,
            transform:   isExpanded ? 'translateX(0)' : 'translateX(-14px)',
            transition:  'opacity 0.45s ease 0.12s, transform 0.45s ease 0.12s',
          }}
        >
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.07)' }}>
            {projects.map((p, i) => (
              <Link
                key={p._id}
                to={`/work/${p._id}`}
                onMouseEnter={() => setHoveredId(p._id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display:        'flex',
                  alignItems:     'baseline',
                  gap:            '14px',
                  padding:        '13px 0',
                  borderBottom:   '1px solid rgba(240,236,230,0.05)',
                  textDecoration: 'none',
                  cursor:         'none',
                }}
              >
                <span style={{
                  fontFamily:    '"Noto Sans Mono", monospace',
                  fontSize:      '9px',
                  letterSpacing: '0.2em',
                  color:         '#ccc',
                  flexShrink:    0,
                  width:         '20px',
                  transition:    'color 0.25s ease',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                <span style={{
                  fontFamily:    '"Noto Sans Mono", monospace',
                  fontSize:      'clamp(0.85rem, 2.2cqw, 1.35rem)',
                  fontStyle:     'italic',
                  fontWeight:    300,
                  lineHeight:    1.1,
                  flex:          1,
                  color:         hoveredId === p._id ? '#f0ece6' : '#777',
                  transform:     hoveredId === p._id ? 'translateX(10px)' : 'translateX(0)',
                  transition:    'color 0.25s ease, transform 0.3s cubic-bezier(0.25,0.1,0.25,1)',
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                }}>
                  {p.title}
                </span>

                <span style={{
                  fontFamily:    '"Noto Sans Mono", monospace',
                  fontSize:      '10px',
                  color:         '#aaa',
                  flexShrink:    0,
                  opacity:       hoveredId === p._id ? 1 : 0,
                  transform:     hoveredId === p._id ? 'translateX(0)' : 'translateX(-6px)',
                  transition:    'opacity 0.25s ease, transform 0.3s ease',
                }}>
                  →</span>

                {p.year && (
                  <span style={{
                    fontFamily:    '"Noto Sans Mono", monospace',
                    fontSize:      '9px',
                    letterSpacing: '0.1em',
                    color:         '#ccc',
                    flexShrink:    0,
                    opacity:       hoveredId === p._id ? 1 : 0.45,
                    transition:    'opacity 0.25s ease',
                  }}>
                    {p.year}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div onMouseEnter={onEnter} style={{ padding: '16px 32px 0', flexShrink: 0 }}>
        <span style={{
          display:       'block',
          fontFamily:    '"Noto Sans Mono", monospace',
          fontSize:      'clamp(1.8rem, 11cqw, 10rem)',
          fontWeight:    700,
          lineHeight:    0.88,
          letterSpacing: '-0.03em',
          whiteSpace:    'nowrap',
          userSelect:    'none',
          color:         isOther ? 'rgba(240,236,230,0.16)' : '#f0ece6',
          transition:    'color 0.45s ease',
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Mobile: one category per section, tap to expand ──────────────────────────

const mono = '"Noto Sans Mono", monospace'

function MobileCategorySection({ slug, label, index, description }) {
  const [projects,  setProjects]  = useState([])
  const [open,      setOpen]      = useState(false)
  const [cycleIdx,  setCycleIdx]  = useState(0)
  const sectionRef = useRef(null)
  const headerRef  = useRef(null)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 30)
    }
  }

  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc)
        { _id, title, year, coverImage }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    if (imgProjects.length <= 1) return
    const t = setInterval(() => setCycleIdx(i => (i + 1) % imgProjects.length), 2400)
    return () => clearInterval(t)
  }, [imgProjects.length])

  const cover = imgProjects[cycleIdx % Math.max(imgProjects.length, 1)]

  return (
    <div ref={sectionRef} style={{ borderBottom: '1px solid rgba(240,236,230,0.07)' }}>
      {/* Cover image */}
      <div onClick={toggle} style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#000', cursor: 'pointer' }}>
        {imgProjects.map((p, i) => (
          <img
            key={p._id}
            src={imageUrl(p.coverImage.asset._ref)}
            alt={p.title}
            draggable={false}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: i === (cycleIdx % Math.max(imgProjects.length, 1)) ? 1 : 0,
              transition: 'opacity 0.9s ease',
            }}
          />
        ))}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }} />
        {/* Big label */}
        <span style={{
          position: 'absolute', bottom: 16, left: 20,
          fontFamily: mono, fontSize: 'clamp(2.4rem, 12vw, 5rem)',
          fontWeight: 700, lineHeight: 0.88, letterSpacing: '-0.03em',
          color: '#f0ece6', userSelect: 'none',
        }}>
          {label}
        </span>
      </div>

      {/* Header row — tap to toggle */}
      <button
        ref={headerRef}
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555' }}>
            {index}
          </span>
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>
            {description}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projects.length > 0 && (
            <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.2em', color: '#444' }}>
              {projects.length} {projects.length === 1 ? 'work' : 'works'}
            </span>
          )}
          <span style={{
            fontFamily: mono, fontSize: '10px', color: '#555',
            transition: 'transform 0.35s ease',
            display: 'inline-block',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}>
            +
          </span>
        </div>
      </button>

      {/* Work list */}
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? `${projects.length * 56}px` : '0px',
        transition: 'max-height 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)', margin: '0 20px' }}>
          {projects.map((p, i) => (
            <Link
              key={p._id}
              to={`/work/${p._id}`}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid rgba(240,236,230,0.05)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.2em', color: '#555', width: 20, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: mono, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300, flex: 1, color: '#f0ece6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
              </span>
              {p.year && (
                <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: '#555', flexShrink: 0 }}>
                  {p.year}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function WorksPageMobile() {
  return (
    <div style={{ backgroundColor: '#000000', height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' }}>
      {CATEGORIES.map(({ slug, label, index, description }) => (
        <MobileCategorySection
          key={slug}
          slug={slug}
          label={label}
          index={index}
          description={description}
        />
      ))}
    </div>
  )
}

// ── Desktop (unchanged) ────────────────────────────────────────────────────────

function WorksPageDesktop() {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    gsap.fromTo(
      Array.from(containerRef.current.children),
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
    )
  }, [])

  const anyHovered = hoveredIdx !== null

  return (
    <div
      ref={containerRef}
      style={{
        height:          '100vh',
        display:         'flex',
        overflow:        'hidden',
        backgroundColor: '#000000',
      }}
    >
      {CATEGORIES.map(({ slug, label, index, description }, i) => (
        <CategoryPanel
          key={slug}
          slug={slug}
          label={label}
          index={index}
          description={description}
          isExpanded={hoveredIdx === i}
          isOther={anyHovered && hoveredIdx !== i}
          isLast={i === CATEGORIES.length - 1}
          onEnter={() => setHoveredIdx(i)}
          onLeave={() => setHoveredIdx(null)}
        />
      ))}
    </div>
  )
}

export default function WorksPage() {
  const isMobile = useIsMobile()
  return isMobile ? <WorksPageMobile /> : <WorksPageDesktop />
}
