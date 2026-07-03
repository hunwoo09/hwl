import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const [imgWidthPct, setImgWidthPct] = useState(null)
  const labelRef = useRef(null)
  const panelRef = useRef(null)
  const isExpandedRef = useRef(isExpanded)
  isExpandedRef.current = isExpanded

  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)

  // Track the label's width as a percentage of the panel so the cover image and
  // the list column can share its right edge instead of a guessed fixed split.
  // Measuring the label at its current (resting) size and correcting once the
  // hover transition settles caused a visible second nudge on the first-ever
  // hover. Instead, predict the EXPANDED-state width up front — using the
  // known flex ratios (3.2 : 0.42 : 0.42) to work out how wide the panel would
  // be if expanded, then measuring a hidden clone of the label at that size —
  // so even the very first hover already has the right target and moves once.
  useLayoutEffect(() => {
    const labelEl = labelRef.current
    const panelEl = panelRef.current
    if (!labelEl || !panelEl) return

    const predict = () => {
      const outerWidth = panelEl.parentElement?.getBoundingClientRect().width
      if (!outerWidth) return
      const expandedWidth = outerWidth * (3.2 / (3.2 + 0.42 + 0.42))
      const fontSizePx = Math.min(320, Math.max(40, expandedWidth * 0.22))

      const clone = document.createElement('span')
      clone.textContent = label
      clone.style.cssText = 'position:absolute; visibility:hidden; white-space:nowrap; ' +
        'display:inline-block; font-family:"Sequel Sans Heavy Disp"; ' +
        `font-weight:900; letter-spacing:0; font-size:${fontSizePx}px;`
      document.body.appendChild(clone)
      const labelWidth = clone.getBoundingClientRect().width
      document.body.removeChild(clone)
      setImgWidthPct((labelWidth + 32) / expandedWidth * 100)
    }

    if (document.fonts?.ready) document.fonts.ready.then(predict)
    else predict()

    // Safety net: if the prediction is ever slightly off, self-correct once the
    // panel's own expand transition actually finishes (fires as 'flex-grow'
    // since the browser expands the 'flex' shorthand). Gated to isExpanded only
    // — the collapse fires the same event and would otherwise overwrite the
    // good expanded-state value with one measured against the tiny resting panel.
    const onTransitionEnd = (e) => {
      if (e.target !== panelEl || e.propertyName !== 'flex-grow' || !isExpandedRef.current) return
      const panelWidth = panelEl.getBoundingClientRect().width
      const labelWidth = labelEl.getBoundingClientRect().width
      if (panelWidth) setImgWidthPct((labelWidth + 32) / panelWidth * 100)
    }
    panelEl.addEventListener('transitionend', onTransitionEnd)
    return () => panelEl.removeEventListener('transitionend', onTransitionEnd)
  }, [label])

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
      ref={panelRef}
      onMouseLeave={handleLeave}
      style={{
        flex:           isExpanded ? 3.2 : isOther ? 0.42 : 1,
        height:         '100%',
        borderRight:    'none',
        display:        'flex',
        flexDirection:  'column',
        padding:        'clamp(32px, 8vh, 80px) 0 clamp(20px, 4vh, 44px)',
        overflow:       'hidden',
        transition:     'flex 0.72s cubic-bezier(0.4, 0, 0.2, 1)',
        containerType:  'inline-size',
        cursor:         'default',
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
            ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 25%, rgba(255,255,255,0.22) 75%, transparent)'
            : 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 25%, rgba(255,255,255,0.07) 75%, transparent)',
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
          fontFamily:    '"Sequel Sans Heavy Disp"',
          fontSize:      '10px',
          fontWeight:    400,
          letterSpacing: '0.38em',
          textTransform: 'uppercase',
          color:         isExpanded ? '#ffffff' : '#bbb',
          whiteSpace:    'nowrap',
          marginBottom:  '10px',
          transform:     isExpanded ? 'translateY(10px)' : 'translateY(30px)',
          transition:    'color 0.4s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {index}
        </span>

        <span style={{
          display:       'block',
          fontFamily:    '"Sequel Sans Heavy Disp"',
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
            fontFamily:    '"Sequel Sans Heavy Disp"',
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
          minWidth:   0,
          position:   'relative',
          zIndex:     3,
        }}>

        <div style={{
          width:      isExpanded ? (imgWidthPct != null ? `${imgWidthPct}%` : '42%') : '100%',
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
                transition: 'opacity 0.65s ease, filter 0.6s ease, transform 0.6s ease',
                filter:     isOther
                  ? 'blur(8px) grayscale(100%) brightness(0.62)'
                  : (hoveredId === p._id ? 'grayscale(0%)' : 'grayscale(100%)'),
                transform:  isOther ? 'scale(1.08)' : 'scale(1)',
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
            minWidth:    0,
            overflowY:   'auto',
            padding:     '0 32px 0 20px',
            opacity:     isExpanded ? 1 : 0,
            transform:   isExpanded ? 'translateX(0)' : 'translateX(-14px)',
            transition:  isExpanded ? 'none' : 'opacity 0.45s ease, transform 0.45s ease',
          }}
        >
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
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
                  borderBottom:   '1px solid rgba(255,255,255,0.05)',
                  textDecoration: 'none',
                  cursor:         'pointer',
                }}
              >
                <span style={{
                  fontFamily:    '"Sequel Sans Heavy Disp"',
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
                  fontFamily:    '"Sequel Sans Heavy Disp"',
                  fontSize:      'clamp(0.85rem, 2.2cqw, 1.35rem)',
                  fontStyle:     'normal',
                  fontWeight:    300,
                  lineHeight:    1.3,
                  flex:          1,
                  color:         hoveredId === p._id ? '#ffffff' : '#777',
                  transform:     hoveredId === p._id ? 'translateX(10px)' : 'translateX(0)',
                  transition:    'color 0.25s ease, transform 0.3s cubic-bezier(0.25,0.1,0.25,1)',
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                }}>
                  {p.title}
                </span>

                <span style={{
                  fontFamily:    '"Sequel Sans Heavy Disp"',
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
                    fontFamily:    '"Sequel Sans Heavy Disp"',
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
        <span
          ref={labelRef}
          style={{
            display:       'inline-block',
            fontFamily:    '"Sequel Sans Heavy Disp"',
            fontSize:      'clamp(2.5rem, min(22cqw, 18vh), 20rem)',
            fontWeight:    900,
            lineHeight:    0.88,
            letterSpacing: '0',
            whiteSpace:    'nowrap',
            userSelect:    'none',
            color:         isOther ? 'rgba(255,255,255,0.16)' : '#ffffff',
            transition:    'color 0.45s ease',
          }}>
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Mobile ────────────────────────────────────────────────────────────────────

const mono = '"Sequel Sans Heavy Disp"'
const NAV_H = 'calc(env(safe-area-inset-top, 0px) + 52px)'

function MobileCategorySection({ slug, label, index, description }) {
  const navigate    = useNavigate()
  const [cycleIdx,  setCycleIdx]  = useState(0)
  const [projects,  setProjects]  = useState([])
  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc) { _id, coverImage }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    if (imgProjects.length <= 1) return
    const t = setInterval(() => setCycleIdx(i => (i + 1) % imgProjects.length), 2400)
    return () => clearInterval(t)
  }, [imgProjects.length])

  return (
    <div onClick={() => navigate(`/${slug}`)} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>
      {/* Cover image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#000' }}>
        {imgProjects.map((p, i) => (
          <img key={p._id} src={imageUrl(p.coverImage.asset._ref)} alt="" draggable={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === (cycleIdx % Math.max(imgProjects.length, 1)) ? 1 : 0, transition: 'opacity 1.4s ease-in-out' }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', bottom: 16, left: 20, fontFamily: '"Sequel Sans Heavy Disp"', fontSize: 'clamp(2.4rem, 12vw, 5rem)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '0.12em', color: '#ffffff', userSelect: 'none' }}>
          {label}
        </span>
      </div>
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#555' }}>{index}</span>
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888' }}>{description}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: '10px', color: '#444' }}>→</span>
      </div>
    </div>
  )
}

function WorksPageMobile() {
  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', paddingTop: NAV_H }}>
      {CATEGORIES.map(({ slug, label, index, description }) => (
        <MobileCategorySection key={slug} slug={slug} label={label} index={index} description={description} />
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
