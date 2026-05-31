import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
const NAV_H = 'calc(env(safe-area-inset-top, 0px) + 52px)'

function MobileCategorySection({ slug, label, index, description, isOpen, onToggle }) {
  const sectionRef  = useRef(null)
  const listRef     = useRef(null)
  const [projects,  setProjects]  = useState([])
  const [cycleIdx,  setCycleIdx]  = useState(0)
  const [boxOpen,   setBoxOpen]   = useState(false)
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

  useEffect(() => {
    if (!isOpen) return
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isOpen])

  // Double rAF: let browser paint the box at maxHeight:0 first, then trigger CSS transition
  useEffect(() => {
    if (!isOpen) { setBoxOpen(false); return }
    let r1, r2
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setBoxOpen(true))
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [isOpen])

  // Stagger items in after box starts opening
  useEffect(() => {
    if (!boxOpen || !listRef.current) return
    const items = listRef.current.querySelectorAll('a')
    gsap.fromTo(items,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', delay: 0.2 }
    )
  }, [boxOpen])

  return (
    <div
      ref={sectionRef}
      style={{
        borderBottom: '1px solid rgba(240,236,230,0.07)',
        scrollMarginTop: NAV_H,
      }}
    >
      {/* Cover image */}
      <div
        onClick={onToggle}
        style={{
          flexShrink: 0,
          position: 'relative',
          width: '100%', aspectRatio: '16/9',
          overflow: 'hidden', backgroundColor: '#000', cursor: 'pointer',
        }}
      >
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

      {/* Header row */}
      <button
        onClick={onToggle}
        style={{ flexShrink: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555' }}>{index}</span>
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>{description}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {projects.length > 0 && (
            <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.2em', color: '#444' }}>
              {projects.length} {projects.length === 1 ? 'work' : 'works'}
            </span>
          )}
          <span style={{ fontFamily: mono, fontSize: '10px', color: '#555', display: 'inline-block', transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(45deg)' : 'none' }}>+</span>
        </div>
      </button>

      {/* Work list — grows naturally with the section, no instant black box */}
      {isOpen && (
        <div style={{
          overflow: 'hidden',
          maxHeight: boxOpen ? 'calc(100vh - env(safe-area-inset-top, 0px) - 52px - 56.25vw - 60px)' : '0px',
          transition: 'max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div
            ref={listRef}
            style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: 'inherit' }}
          >
              <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)', margin: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
                {projects.map((p, i) => (
                  <Link
                    key={p._id}
                    to={`/work/${p._id}`}
                    style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(240,236,230,0.05)', textDecoration: 'none' }}
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
      )}
    </div>
  )
}

function WorksPageMobile() {
  const [openSlug, setOpenSlug] = useState(null)

  const toggle = (slug) => setOpenSlug(prev => prev === slug ? null : slug)

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', paddingTop: NAV_H, paddingBottom: openSlug ? '60vh' : 0 }}>
      {CATEGORIES.map(({ slug, label, index, description }) => (
        <MobileCategorySection
          key={slug}
          slug={slug}
          label={label}
          index={index}
          description={description}
          isOpen={openSlug === slug}
          onToggle={() => toggle(slug)}
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
