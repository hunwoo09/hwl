import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { motion } from 'framer-motion'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import HeroCanvas from './HeroCanvas'
import { transitionState } from '../transitionState'

const LABEL_Y     = 'calc(50vh + 18vh + 32px)'
const V_LIST_W_VW = 42

let _introPlayed = false
let _persistedMode = 'h'
let _shuffledSlides = null
let _shuffleKey = ''
let _cachedProjects = null
export function resetIntro() { _introPlayed = false }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function Hero() {
  const skipIntro = _introPlayed
  const isMobile  = useIsMobile()
  const navigate  = useNavigate()

  const [projects,     setProjects]    = useState(_cachedProjects || [])
  const [cat,          setCat]         = useState('all')
  const [activeAbsIdx, setActiveAbsIdx]= useState(0)
  const [dataLoaded,   setDataLoaded]  = useState(_cachedProjects !== null)
  const [animFinished, setAnimFinished]= useState(skipIntro)
  const [overlayGone,  setOverlayGone] = useState(skipIntro)
  const [mode,         setMode]        = useState(_persistedMode)

  const introComplete = dataLoaded && animFinished

  const wrapRef        = useRef(null)
  const canvasWrapRef  = useRef(null)
  const canvasRef      = useRef(null)
  const labelRef       = useRef(null)
  const labelTitleRef  = useRef(null)
  const labelYearRef   = useRef(null)
  const overlayRef     = useRef(null)
  const loadLineRef    = useRef(null)
  const lineRef        = useRef(null)

  const modeRef         = useRef(_persistedMode)
  const vListRef        = useRef(null)
  const vListItemRefs   = useRef([])
  const slidesRef       = useRef([])
  const activeAbsIdxRef = useRef(0)
  const labelReadyRef   = useRef(skipIntro)
  const sliderLabelRef  = useRef(null)
  const listLabelRef    = useRef(null)
  const leftViaListRef  = useRef(false)

  // ── Text reveal helper ────────────────────────────────────────────────────
  const showLabel = useCallback((idx) => {
    const slide = slidesRef.current[idx]
    if (!slide) return
    if (labelTitleRef.current) labelTitleRef.current.textContent = slide.title || ''
    if (labelYearRef.current)  labelYearRef.current.textContent  = slide.year  || ''
    if (!labelRef.current) return
    gsap.set(labelRef.current, { opacity: 1 })
    const rows = [labelTitleRef.current, labelYearRef.current].filter(Boolean)
    gsap.fromTo(rows,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.07 }
    )
  }, [])

  // ── Toggle-label reveal (SLIDER / LIST), bottom-to-top mask reveal ────────
  const revealToggleLabels = useCallback(() => {
    const labels = [sliderLabelRef.current, listLabelRef.current].filter(Boolean)
    if (!labels.length) return
    gsap.fromTo(labels,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }
    )
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (_cachedProjects) { setProjects(_cachedProjects); setDataLoaded(true); return }
    client.fetch(
      `*[_type == "project" && category != "archive" && category != ".archive"] | order(orderRank asc, _createdAt desc)
       { _id, title, year, category,
         description, medium, location, website, credits, softwares,
         coverImage { "assetRef": asset._ref, asset->{ metadata { dimensions { aspectRatio } } } },
         images,
         videoFile { asset { _ref } },
         videos[] { asset { _ref } },
         glbFile   { asset { _ref } },
         codeFiles }`
    ).then(data => {
      _cachedProjects = data
      setProjects(data)
      setDataLoaded(true)
    }).catch(() => setDataLoaded(true))
  }, [])

  const projectsMap = useMemo(() =>
    Object.fromEntries(projects.map(p => [p._id, p])),
    [projects]
  )

  const allSlides = useMemo(() => {
    const key = projects.map(p => p._id).join(',')
    if (key && key === _shuffleKey && _shuffledSlides) return _shuffledSlides
    const seen   = new Set()
    const slides = []
    for (const p of projects) {
      const category = (p.category || '').replace('.', '').toLowerCase()
      const base     = { projectId: p._id, title: p.title, year: p.year, category }
      const coverRef = p.coverImage?.assetRef ?? p.coverImage?.asset?._ref
      if (!coverRef || seen.has(coverRef)) continue
      seen.add(coverRef)
      const ar = p.coverImage?.asset?.metadata?.dimensions?.aspectRatio ?? 1
      slides.push({ ...base, _id: `${p._id}-${coverRef}`, imageRef: coverRef, aspectRatio: ar })
    }
    _shuffleKey = key
    _shuffledSlides = shuffle(slides)
    return _shuffledSlides
  }, [projects])

  const filtered = useMemo(() =>
    cat === 'all' ? allSlides : allSlides.filter(s => s.category === cat),
    [cat, allSlides]
  )

  slidesRef.current = filtered

  // ── Label on slide change ─────────────────────────────────────────────────
  const slideIdx = filtered.length > 0 ? activeAbsIdx % filtered.length : 0
  useEffect(() => {
    if (labelReadyRef.current) showLabel(slideIdx)
  }, [slideIdx, showLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click → navigate ─────────────────────────────────────────────────────
  const handleItemClick = useCallback((slide) => {
    const projectId = slide.projectId
    const state     = { project: projectsMap[projectId] ?? null }
    if (window.innerWidth < 768) {
      navigate(`/work/${projectId}`, { state })
      return
    }
    if (modeRef.current === 'v') {
      leftViaListRef.current = true
      transitionState.fromList = true
      gsap.to(wrapRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        onComplete: () => navigate(`/work/${projectId}`, { state: { ...state, fromList: true } }),
      })
      return
    }
    gsap.to(wrapRef.current, {
      y: -window.innerHeight,
      duration: 0.6,
      ease: 'power3.in',
      onComplete: () => navigate(`/work/${projectId}`, { state }),
    })
  }, [navigate, projectsMap])

  // ── List entrance: masked reveal when entering V mode ─────────────────────
  // Mounting straight into 'v' only happens when returning from a work page
  // opened via the list — for that case, wipe the whole panel top-to-bottom
  // (same clip-path technique as the horizontal gallery's reveal, just
  // rotated to vertical). Toggling to list mid-session (the LIST button)
  // keeps the original per-item slide-up.
  // isFirstEffectRef tracks the component's very first effect firing (the
  // mount), regardless of what `mode` happens to be at that point — that's
  // the only reliable signal for "did we mount straight into list mode".
  const isFirstEffectRef = useRef(true)
  useEffect(() => {
    const isReturning = isFirstEffectRef.current
    isFirstEffectRef.current = false
    if (mode !== 'v') return

    if (isReturning) {
      if (!vListRef.current) return
      gsap.fromTo(vListRef.current,
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power3.inOut', delay: 0.2 }
      )
      return
    }

    const items = vListItemRefs.current.filter(Boolean)
    if (!items.length) return
    gsap.set(items, { yPercent: 110 })
    gsap.to(items, { yPercent: 0, duration: 0.75, ease: 'expo.out', force3D: true, delay: 0.8 })
  }, [mode])

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const handleModeToggle = useCallback(() => {
    const newMode = modeRef.current === 'h' ? 'v' : 'h'
    if (lineRef.current) {
      gsap.to(lineRef.current, { rotate: newMode === 'v' ? 90 : 0, duration: 0.65, ease: 'power2.inOut' })
    }
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })

    if (modeRef.current === 'v') {
      // Exiting list → slide all items back down, then switch
      const items = vListItemRefs.current.filter(Boolean)
      gsap.to(items, {
        yPercent: 110, duration: 0.4, ease: 'power3.in', force3D: true,
        onComplete: () => {
          modeRef.current = newMode
          _persistedMode  = newMode
          setMode(newMode)
        },
      })
    } else {
      modeRef.current = newMode
      _persistedMode  = newMode
      setMode(newMode)
    }
  }, [])

  // ── Init decorative line ──────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (lineRef.current) gsap.set(lineRef.current, {
      xPercent: -50, yPercent: -50,
      rotate: modeRef.current === 'v' ? 90 : 0,
      height: Math.max(window.innerWidth, window.innerHeight),
    })
  }, [])

  // ── Intro: hide before first paint ───────────────────────────────────────
  useLayoutEffect(() => {
    if (!skipIntro && wrapRef.current) gsap.set(wrapRef.current, { opacity: 0 })
  }, [skipIntro])

  // ── Intro: curtain + cascade ──────────────────────────────────────────────
  useEffect(() => {
    if (!introComplete) return
    const cascade = () => {
      if (!wrapRef.current) return
      gsap.set(wrapRef.current, { opacity: 1 })
      if (modeRef.current === 'h' && canvasWrapRef.current) {
        gsap.fromTo(canvasWrapRef.current,
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.inOut' }
        )
      }
      revealToggleLabels()
    }
    if (skipIntro) { cascade(); return }
    _introPlayed = true
    labelReadyRef.current = false
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })
    gsap.to(overlayRef.current, {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      opacity: 0,
      duration: 0.9, ease: 'power3.inOut',
      onComplete: () => {
        setOverlayGone(true)
        window.dispatchEvent(new Event('nav-intro-ready'))
        if (!wrapRef.current) return
        gsap.set(wrapRef.current, { opacity: 1 })
        if (modeRef.current === 'h' && canvasWrapRef.current) {
          gsap.fromTo(canvasWrapRef.current,
            { clipPath: 'inset(0 100% 0 0)' },
            { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'power3.inOut' }
          )
        }
        revealToggleLabels()
        gsap.delayedCall(0.4, () => {
          labelReadyRef.current = true
          const n   = slidesRef.current.length
          const idx = activeAbsIdxRef.current % Math.max(n, 1)
          showLabel(idx)
        })
      },
    })
  }, [introComplete, skipIntro, showLabel, revealToggleLabels])

  // ── Always return to slider view when re-entering the home page ──────────
  // (unless we're leaving because a list item was clicked through to its
  // work page — then the list should still be there on the way back)
  useEffect(() => () => { if (!leftViaListRef.current) _persistedMode = 'h' }, [])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: '#000000' }}>

      {!skipIntro && !overlayGone && createPortal(
        <div ref={overlayRef} style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999, clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', willChange: 'clip-path, opacity' }}>
          <video autoPlay muted playsInline preload="auto" disablePictureInPicture
            src="/loading-video.webm"
            onEnded={() => setAnimFinished(true)} onError={() => setAnimFinished(true)}
            onTimeUpdate={(e) => { const { currentTime, duration } = e.target; if (duration && loadLineRef.current) loadLineRef.current.style.transform = `scaleX(${currentTime / duration})` }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: isMobile ? 'contain' : 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'none' }}>
            <div style={{ width: '72px', height: '1px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <div ref={loadLineRef} style={{ width: '100%', height: '100%', background: '#ffffff', transformOrigin: 'left', transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>, document.body
      )}

      {!isMobile && (
        <div ref={lineRef} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '1px',
          background: 'rgba(255,255,255,0.07)',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}

      {/* Single canvas — handles both H and V modes, meshes animate between layouts */}
      <div ref={canvasWrapRef} style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
        {filtered.length > 0 && (
          <HeroCanvas
            ref={canvasRef}
            slides={filtered}
            mode={mode}
            onActiveChange={(idx) => { activeAbsIdxRef.current = idx; setActiveAbsIdx(idx) }}
            onSlideClick={handleItemClick}
          />
        )}
      </div>

      {!isMobile && (<>
        <button
          onClick={() => mode !== 'h' && handleModeToggle()}
          style={{
            position: 'absolute', bottom: '48px', right: 'calc(50% + 14px)', zIndex: 20,
            background: 'none', border: 'none', padding: '6px 0',
            cursor: mode === 'h' ? 'default' : 'pointer',
            fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace',
            fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
            fontWeight: mode === 'h' ? 700 : 300,
            color: mode === 'h' ? '#ffffff' : 'rgba(255,255,255,0.28)',
            transition: 'color 0.4s ease',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          <span ref={sliderLabelRef} style={{ display: 'inline-block' }}>SLIDER</span>
        </button>
        <button
          onClick={() => mode !== 'v' && handleModeToggle()}
          style={{
            position: 'absolute', bottom: '48px', left: 'calc(50% + 14px)', zIndex: 20,
            background: 'none', border: 'none', padding: '6px 0',
            cursor: mode === 'v' ? 'default' : 'pointer',
            fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace',
            fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
            fontWeight: mode === 'v' ? 700 : 300,
            color: mode === 'v' ? '#ffffff' : 'rgba(255,255,255,0.28)',
            transition: 'color 0.4s ease',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          <span ref={listLabelRef} style={{ display: 'inline-block' }}>LIST</span>
        </button>
      </>)}

      {/* H-mode title / year label */}
      {mode === 'h' && (
        <div style={{
          position: 'absolute', zIndex: 20, pointerEvents: 'none',
          top: LABEL_Y, left: 0, right: 0,
        }}>
          <div ref={labelRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0 }}>
            <div style={{ overflow: 'hidden' }}>
              <p ref={labelTitleRef} style={{ fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: isMobile ? '0.95rem' : 'clamp(0.85rem, 1.5vw, 1.2rem)', fontStyle: 'normal', fontWeight: 300, letterSpacing: '0.02em', color: '#ffffff', lineHeight: 1.2, marginBottom: 12, paddingRight: '0.25em' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p ref={labelYearRef} style={{ fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: '11px', letterSpacing: '0.45em', color: '#2e2e2e' }} />
            </div>
          </div>
        </div>
      )}

      {/* V-mode: black panel covers the right side so the line doesn't bleed through */}
      {!isMobile && mode === 'v' && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: `${V_LIST_W_VW}vw`,
          background: '#000',
          zIndex: 3,
          pointerEvents: 'none',
        }} />
      )}

      {/* V-mode work list (right panel text labels) */}
      {!isMobile && mode === 'v' && (
        <div
          ref={vListRef}
          className="no-scrollbar"
          style={{
            position:       'absolute',
            top:            0, right: 0, bottom: 0,
            width:          `${V_LIST_W_VW}vw`,
            zIndex:         10,
            overflowY:      'auto',
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            padding:        '80px 44px 80px 24px',
          }}
        >
          {filtered.map((slide, i) => {
            const isActive = i === slideIdx
            return (
              <div key={slide._id} style={{ overflow: 'hidden' }}>
                <div
                  ref={el => { vListItemRefs.current[i] = el }}
                  onMouseEnter={() => canvasRef.current?.centerSlide(i)}
                  onClick={() => {
                    leftViaListRef.current = true
                    const state = { project: projectsMap[slide.projectId] ?? null, fromList: true }
                    transitionState.fromList = true
                    gsap.to(wrapRef.current, {
                      opacity: 0,
                      duration: 0.45,
                      ease: 'power2.inOut',
                      onComplete: () => navigate(`/work/${slide.projectId}`, { state }),
                    })
                  }}
                  style={{
                    position:     'relative',
                    display:      'flex',
                    alignItems:   'baseline',
                    gap:          '14px',
                    padding:      '8px 10px',
                    cursor:       'pointer',
                    userSelect:   'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Swipe fill — scales from left when this item is active */}
                  <motion.div
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    initial={false}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      position:        'absolute',
                      inset:           0,
                      background:      '#ffffff',
                      transformOrigin: 'left',
                      pointerEvents:   'none',
                      zIndex:          0,
                    }}
                  />
                  {/* Index + category */}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'baseline', minWidth: '72px' }}>
                    <span style={{ fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: '9px', letterSpacing: '0.12em', color: isActive ? '#000' : '#444', transition: 'color 0.22s ease', width: '18px', flexShrink: 0 }}>
                      {String(i).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: '8px', letterSpacing: '0.22em', textTransform: 'uppercase', color: isActive ? '#222' : '#333', transition: 'color 0.22s ease' }}>
                      {slide.category ? `.${slide.category.replace('.', '').toUpperCase()}` : ''}
                    </span>
                  </div>
                  {/* Title */}
                  <span style={{ position: 'relative', zIndex: 1, flex: 1, fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: 'clamp(0.68rem, 1.1vw, 0.88rem)', fontStyle: 'normal', fontWeight: 300, color: isActive ? '#000' : '#ffffff', transition: 'color 0.22s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {slide.title}
                  </span>
                  {/* Year */}
                  {slide.year && (
                    <span style={{ position: 'relative', zIndex: 1, fontFamily: '"Sequel Sans Heavy Disp", "Noto Sans Mono", monospace', fontSize: '9px', letterSpacing: '0.1em', color: isActive ? '#333' : '#444', transition: 'color 0.22s ease', flexShrink: 0 }}>
                      {slide.year}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
