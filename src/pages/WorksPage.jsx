import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import { imageProps } from '../sanityImage'
import { slugify } from '../slug'

const CATEGORIES = [
  { slug: 'jpg', label: '.JPG', index: '00—1', description: 'Photography & Images' },
  { slug: 'mp4', label: '.MP4', index: '00—2', description: 'Video & Motion'       },
  { slug: 'obj', label: '.OBJ', index: '00—3', description: '3D & Objects'         },
]

function CategoryPanel({ slug, label, index, description, isExpanded, isOther, isLast, onEnter, onLeave }) {
  const [projects,   setProjects]   = useState([])
  const [hoveredId,  setHoveredId]  = useState(null)
  const [cycleIdx,   setCycleIdx]   = useState(0)
  const [imgWidthPct, setImgWidthPct] = useState(null)
  const labelRef = useRef(null)
  const panelRef = useRef(null)
  const boxRef = useRef(null)
  const letterRefs = useRef([])
  const isExpandedRef = useRef(isExpanded)
  useEffect(() => { isExpandedRef.current = isExpanded })

  // Entrance: cover image rises from below like it's unveiled from a black
  // box, label letters reveal through a clip mask — mirrors the Archive page.
  useEffect(() => {
    const box = boxRef.current
    const letters = letterRefs.current.filter(Boolean)
    if (!box && !letters.length) return

    if (box) gsap.set(box, { yPercent: 100, opacity: 0, force3D: true })
    if (letters.length) gsap.set(letters, { yPercent: 110, force3D: true })

    const tl = gsap.timeline({ delay: 0.45 })
    if (box) {
      tl.to(box, {
        yPercent:   0,
        opacity:    1,
        duration:   0.85,
        ease:       'power3.out',
        clearProps: 'transform,opacity,willChange',
      })
    }
    if (letters.length) {
      tl.to(letters, {
        yPercent:   0,
        duration:   0.6,
        stagger:    0.045,
        ease:       'power3.out',
        clearProps: 'transform,willChange',
      }, box ? '-=0.55' : 0)
    }
    return () => tl.kill()
  }, [])

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
      if (e.target !== panelEl || e.propertyName !== 'flex-grow') return
      // Collapse finished → rewind the image cycle so the next expand starts at 0
      if (!isExpandedRef.current) { setCycleIdx(0); return }
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
        padding:        '80px 0 44px',
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
          fontSize:      '16px',
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

        <div
          ref={boxRef}
          style={{
            width:      isExpanded ? (imgWidthPct != null ? `${imgWidthPct}%` : '42%') : '100%',
            flexShrink: 0,
            position:   'relative',
            overflow:   'hidden',
            transition: 'width 0.72s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
          {imgProjects.map(p => (
            <img
              key={p._id}
              {...imageProps(p.coverImage, { widths: [500, 900, 1400], sizes: '42vw' })}
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
                to={`/work/${slugify(p.title)}`}
                state={{ fromList: true }}
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

      <div onMouseEnter={onEnter} style={{ padding: '16px 32px 0', flexShrink: 0, overflow: 'hidden' }}>
        <span
          ref={labelRef}
          style={{
            display:       'inline-block',
            fontFamily:    '"Sequel Sans Heavy Disp"',
            fontSize:      'clamp(2.5rem, 22cqw, 20rem)',
            fontWeight:    900,
            lineHeight:    0.88,
            letterSpacing: '0',
            whiteSpace:    'nowrap',
            userSelect:    'none',
            color:         isOther ? 'rgba(255,255,255,0.16)' : '#ffffff',
            transition:    'color 0.45s ease',
          }}>
          {label.split('').map((ch, i) => (
            <span
              key={i}
              ref={el => { letterRefs.current[i] = el }}
              style={{ display: 'inline-block' }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

// ── Mobile ────────────────────────────────────────────────────────────────────

const mono = '"Sequel Sans Heavy Disp"'

const NAV_H = 'calc(env(safe-area-inset-top, 0px) + 52px)'

function MobileCategoryPanel({ slug, label, index, description, isLast, registerPanel, onVisible }) {
  const navigate    = useNavigate()
  const sectionRef  = useRef(null)
  const letterRefs  = useRef([])
  const metaRef     = useRef(null)
  const ctaRef      = useRef(null)
  const revealedRef = useRef(false)
  // Monotonic tick, not a modular index — cycleIdx derives from it, and
  // "has the cycle ever reached image i" (mount gate below) stays a pure
  // computation instead of accumulated state.
  const [tick,      setTick]      = useState(0)
  const [projects,  setProjects]  = useState([])
  const [inView,    setInView]    = useState(false)
  const imgProjects = projects.filter(p => p.coverImage?.asset?._ref)
  const cycleIdx    = imgProjects.length ? tick % imgProjects.length : 0

  const onVisibleRef = useRef(onVisible)
  useEffect(() => { onVisibleRef.current = onVisible })

  useEffect(() => {
    client.fetch(
      `*[_type == "project" && (category == $cat || category == $dot)]
        | order(orderRank asc, _createdAt desc) { _id, coverImage }`,
      { cat: slug, dot: '.' + slug }
    ).then(setProjects)
  }, [slug])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting)
      if (e.isIntersecting) onVisibleRef.current?.()
    }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Masked letter reveal the first time the panel scrolls into view — same
  // treatment as the desktop category panels' entrance.
  useEffect(() => {
    if (!inView || revealedRef.current) return
    revealedRef.current = true
    const letters = letterRefs.current.filter(Boolean)
    if (letters.length) {
      gsap.fromTo(letters,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.85, ease: 'expo.out', stagger: 0.05, force3D: true })
    }
    gsap.fromTo([metaRef.current, ctaRef.current].filter(Boolean),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, delay: 0.25 })
  }, [inView])

  // Cycle only while the panel is actually on screen — no decode/network
  // work for panels scrolled past, no state churn in a backgrounded tab.
  useEffect(() => {
    if (imgProjects.length <= 1 || !inView) return
    const t = setInterval(() => setTick(i => i + 1), 2800)
    return () => clearInterval(t)
  }, [imgProjects.length, inView])

  return (
    <section
      ref={el => { sectionRef.current = el; registerPanel?.(el) }}
      onClick={() => navigate(`/${slug}`)}
      style={{
        position: 'relative',
        // Shorter than the viewport so the next panel's cover always peeks
        // in from the bottom — the page visibly continues, no guessing.
        height: isLast ? '100dvh' : '86dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        overflow: 'hidden',
        backgroundColor: '#000',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Full-bleed cycling covers. Mount an image only once the cycle
          reaches it (current + next kept warm for the crossfade). */}
      {imgProjects.map((p, i) => i <= tick + 1 && (
        <img key={p._id} {...imageProps(p.coverImage, { widths: [480, 800, 1200], sizes: '100vw' })} alt="" draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: i === cycleIdx ? 1 : 0,
            transition: 'opacity 1.6s ease-in-out',
            userSelect: 'none',
          }}
        />
      ))}

      {/* Scrims — navbar/index zone up top, type zone at the bottom */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 24%, transparent 48%, rgba(0,0,0,0.82) 100%)', pointerEvents: 'none' }} />

      {/* ── Type block ── */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 30px' }}>
        <div ref={metaRef} style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '10px', opacity: 0 }}>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#888' }}>{index}</span>
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#999' }}>{description}</span>
        </div>

        <div style={{ overflow: 'hidden', lineHeight: 0.88, marginBottom: '16px' }}>
          <span style={{ display: 'inline-block', fontFamily: mono, fontSize: 'clamp(3.6rem, 19vw, 7rem)', fontWeight: 900, letterSpacing: '0.02em', color: '#ffffff', whiteSpace: 'nowrap', userSelect: 'none' }}>
            {label.split('').map((ch, i) => (
              <span key={i} ref={el => { letterRefs.current[i] = el }} style={{ display: 'inline-block', transform: 'translateY(110%)' }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </div>

        <div ref={ctaRef} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0 }}>
          <span style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.4)' }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#bbb' }}>
            view collection
          </span>
        </div>
      </div>
    </section>
  )
}

function WorksPageMobile() {
  const scrollerRef = useRef(null)
  const panelEls    = useRef([])
  const [activeIdx, setActiveIdx] = useState(0)

  const jumpTo = (i) => {
    panelEls.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar"
      data-lenis-prevent
      style={{
        height: '100dvh',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory',
        overscrollBehavior: 'contain',
        backgroundColor: '#000000',
      }}
    >
      {/* Category index — always visible under the navbar, doubles as jump
          nav, and tells the visitor up front there are three sections */}
      <div style={{
        position: 'fixed', top: NAV_H, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '6px 12px',
        pointerEvents: 'none',
      }}>
        {CATEGORIES.map(({ slug, label }, i) => (
          <button
            key={slug}
            onClick={() => jumpTo(i)}
            style={{
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: activeIdx === i ? '#ffffff' : 'rgba(255,255,255,0.38)',
              transition: 'color 0.35s ease',
              background: 'none', border: 'none',
              minHeight: 44, padding: '12px 10px',
              pointerEvents: 'auto',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              textShadow: '0 1px 8px rgba(0,0,0,0.8)',
            }}
          >
            {label}
            {i < CATEGORIES.length - 1 && <span style={{ marginLeft: '14px', color: 'rgba(255,255,255,0.18)' }}>/</span>}
          </button>
        ))}
      </div>

      {CATEGORIES.map(({ slug, label, index, description }, i) => (
        <MobileCategoryPanel
          key={slug}
          slug={slug}
          label={label}
          index={index}
          description={description}
          isLast={i === CATEGORIES.length - 1}
          registerPanel={el => { panelEls.current[i] = el }}
          onVisible={() => setActiveIdx(i)}
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
    // Delay must clear the page-level crossfade (App.jsx, 450ms) first —
    // starting this reveal while that fade is still running compounds the
    // two opacity ramps and looks janky/piecemeal.
    gsap.fromTo(
      Array.from(containerRef.current.children),
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.5 }
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
