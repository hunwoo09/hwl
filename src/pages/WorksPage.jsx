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

// ── Mobile ────────────────────────────────────────────────────────────────────

const mono = '"Noto Sans Mono", monospace'

function WorkListOverlay({ slug, label, description, onClose }) {
  const [projects, setProjects] = useState([])
  const [visible,  setVisible]  = useState(false)

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc)
        { _id, title, year }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 380)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        backgroundColor: '#000000',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.38s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        flexShrink: 0,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 52px)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 52px) 20px 0',
        borderBottom: '1px solid rgba(240,236,230,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 16 }}>
          <div>
            <span style={{ display: 'block', fontFamily: mono, fontSize: 'clamp(2.4rem, 12vw, 4rem)', fontWeight: 700, lineHeight: 0.88, letterSpacing: '-0.03em', color: '#f0ece6' }}>
              {label}
            </span>
            <span style={{ display: 'block', fontFamily: mono, fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#444', marginTop: 10 }}>
              {description}
              {projects.length > 0 && ` · ${projects.length} ${projects.length === 1 ? 'work' : 'works'}`}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', paddingBottom: 4 }}
          >
            close
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        {projects.map((p, i) => (
          <Link
            key={p._id}
            to={`/work/${p._id}`}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 12,
              padding: '16px 0',
              borderBottom: '1px solid rgba(240,236,230,0.05)',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.2em', color: '#333', width: 20, flexShrink: 0 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: mono, fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 300, flex: 1, color: '#f0ece6' }}>
              {p.title}
            </span>
            {p.year && (
              <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.1em', color: '#444', flexShrink: 0 }}>
                {p.year}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}

function MobileCategorySection({ slug, label, index, description, onOpen }) {
  const [cycleIdx, setCycleIdx] = useState(0)
  const [projects, setProjects] = useState([])
  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc)
        { _id, title, coverImage }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    if (imgProjects.length <= 1) return
    const t = setInterval(() => setCycleIdx(i => (i + 1) % imgProjects.length), 2400)
    return () => clearInterval(t)
  }, [imgProjects.length])

  return (
    <div
      onClick={onOpen}
      style={{ borderBottom: '1px solid rgba(240,236,230,0.07)', cursor: 'pointer' }}
    >
      {/* Cover image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#000' }}>
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
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 16, left: 20, fontFamily: mono, fontSize: 'clamp(2.4rem, 12vw, 5rem)', fontWeight: 700, lineHeight: 0.88, letterSpacing: '-0.03em', color: '#f0ece6', userSelect: 'none' }}>
          {label}
        </span>
      </div>

      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555' }}>{index}</span>
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>{description}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: '10px', color: '#555' }}>+</span>
      </div>
    </div>
  )
}

function WorksPageMobile() {
  const [activeCategory, setActiveCategory] = useState(null)

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' }}>
      {CATEGORIES.map(({ slug, label, index, description }) => (
        <MobileCategorySection
          key={slug}
          slug={slug}
          label={label}
          index={index}
          description={description}
          onOpen={() => setActiveCategory({ slug, label, description })}
        />
      ))}
      {activeCategory && (
        <WorkListOverlay
          slug={activeCategory.slug}
          label={activeCategory.label}
          description={activeCategory.description}
          onClose={() => setActiveCategory(null)}
        />
      )}
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
