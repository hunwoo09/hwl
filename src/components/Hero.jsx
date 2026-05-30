import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'

const GAP = 12
const LERP = 0.09
const SNAP_MS = 200

// Mobile-responsive constants — computed once at module load
const _mob           = typeof window !== 'undefined' && window.innerWidth < 768
const ITEM_W         = _mob ? 0.58  : 0.16
const ITEM_H_VH      = _mob ? 52    : 36
const ACTIVE_SCALE   = _mob ? 1.12  : 1.6
const ITEM_H         = `${ITEM_H_VH}vh`
const SIDE_MARGIN_VW = ITEM_W * (ACTIVE_SCALE - 1) / 2

const CATS = [
  { slug: 'all', label: 'All'  },
  { slug: 'jpg', label: '.JPG' },
  { slug: 'mp4', label: '.MP4' },
  { slug: 'obj', label: '.OBJ' },
]
const SM_STR  = `${(SIDE_MARGIN_VW * 100).toFixed(3)}vw`
const LABEL_Y = `calc(50vh + ${(ITEM_H_VH * ACTIVE_SCALE / 2).toFixed(1)}vh + 32px)`

let _introPlayed = false
export function resetIntro() { _introPlayed = false }

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '').replace(/-(\w+)$/, '.$1')}`
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ?? Gallery item ??????????????????????????????????????????????????????????????
const GalleryItem = memo(function GalleryItem({ slide, isActive, itemH: itemHProp }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/work/${slide.projectId}`)}
      style={{
        flexShrink:      0,
        width:           `${ITEM_W * 100}vw`,
        height:          itemHProp ?? ITEM_H,
        overflow:        'hidden',
        cursor:          'pointer',
        transform:       `scale(${isActive ? ACTIVE_SCALE : 1})`,
        transition:      'transform 0.4s cubic-bezier(0.16,1,0.3,1), margin 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease',
        transformOrigin: 'center center',
        position:        'relative',
        zIndex:          isActive ? 10 : 1,
        marginLeft:      isActive ? SM_STR : 0,
        marginRight:     isActive ? SM_STR : 0,
        opacity:         isActive ? 1 : 0.25,
        willChange:      'transform, opacity',
      }}
    >
      {slide.imageRef ? (
        <img
          src={imageUrl(slide.imageRef)}
          alt={slide.title}
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#111' }} />
      )}
    </div>
  )
})

// ??? Hero ?????????????????????????????????????????????????????????????????????
export default function Hero() {
  const skipIntro = _introPlayed
  const isMobile  = useIsMobile()

  const [projects,     setProjects]    = useState([])
  const [cat,          setCat]         = useState('all')
  const [activeAbsIdx, setActiveAbsIdx]= useState(0)
  const [dataLoaded,   setDataLoaded]  = useState(false)
  const [animFinished, setAnimFinished]= useState(skipIntro)
  const [overlayGone,  setOverlayGone] = useState(skipIntro)

  const introComplete = dataLoaded && animFinished

  const wrapRef       = useRef(null)
  const sliderRef     = useRef(null)
  const trackRef      = useRef(null)
  const labelRef      = useRef(null)
  const labelNumRef   = useRef(null)
  const labelTitleRef = useRef(null)
  const labelYearRef  = useRef(null)
  const ghostNumRef   = useRef(null)
  const overlayRef    = useRef(null)
  const loadLineRef   = useRef(null)

  const targetX         = useRef(0)
  const currentX        = useRef(0)
  const prevX           = useRef(0)
  const totalW          = useRef(0)
  const countRef        = useRef(0)
  const totalItemsRef   = useRef(0)
  const slidesRef       = useRef([])
  const activeAbsIdxRef = useRef(0)
  const lastScroll      = useRef(0)

  const wrapperRefsArr = useRef([])
  const catChangedRef  = useRef(false)
  const animatingRef   = useRef(false)
  const reverseRef     = useRef(false)
  const newScrollXRef  = useRef(null)
  const labelReadyRef  = useRef(skipIntro)

  // ?? Fetch ?????????????????????????????????????????????????????????????????
  useEffect(() => {
    client.fetch(
      `*[_type == "project"] | order(orderRank asc, _createdAt desc)
       { _id, title, year, category, coverImage, images }`
    ).then(data => {
      setProjects(data)
      setDataLoaded(true)
    }).catch(() => {
      setDataLoaded(true)
    })
  }, [])

  // ?? Slides ????????????????????????????????????????????????????????????????
  const allSlides = useMemo(() => {
    const seen   = new Set()
    const slides = []
    for (const p of projects) {
      const category = (p.category || '').replace('.', '').toLowerCase()
      const base     = { projectId: p._id, title: p.title, year: p.year, category }
      const coverRef = p.coverImage?.asset?._ref
      const allRefs  = [
        ...(coverRef ? [coverRef] : []),
        ...(p.images || []).map(img => img?.asset?._ref).filter(r => r && r !== coverRef),
      ]
      for (const ref of allRefs) {
        if (seen.has(ref)) continue
        seen.add(ref)
        slides.push({ ...base, _id: `${p._id}-${ref}`, imageRef: ref })
      }
    }
    return shuffle(slides)
  }, [projects])

  const filtered = useMemo(() =>
    cat === 'all' ? allSlides : allSlides.filter(s => s.category === cat),
    [cat, allSlides]
  )

  const repeated = useMemo(() => {
    if (filtered.length === 0) return []
    const slotW   = window.innerWidth * ITEM_W + GAP
    const oneSet  = filtered.length * slotW
    const minReps = Math.max(3, Math.ceil(window.innerWidth / oneSet) + 2)
    return Array.from({ length: minReps }, () => filtered).flat()
  }, [filtered])

  slidesRef.current     = filtered
  countRef.current      = filtered.length
  totalItemsRef.current = repeated.length

  // ?? totalW ????????????????????????????????????????????????????????????????
  useEffect(() => {
    const calc = () => { totalW.current = countRef.current * (window.innerWidth * ITEM_W + GAP) }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [filtered.length])

  // ?? Scroll reset on category change ???????????????????????????????????????
  useEffect(() => {
    const itemW = window.innerWidth * ITEM_W
    const slotW = itemW + GAP
    const n     = filtered.length

    if (newScrollXRef.current !== null && n > 0) {
      const x      = newScrollXRef.current
      const sm     = window.innerWidth * SIDE_MARGIN_VW
      const viewCX = -x + window.innerWidth / 2
      const raw    = Math.round((viewCX - sm - itemW / 2) / slotW)
      const idx    = Math.max(0, Math.min(n - 1, ((raw % n) + n) % n))
      targetX.current         = x
      currentX.current        = x
      prevX.current           = x
      activeAbsIdxRef.current = idx
      setActiveAbsIdx(idx)
      totalW.current          = n * slotW
      newScrollXRef.current   = null
      return
    }

    // Default: center item 0
    const sm = window.innerWidth * SIDE_MARGIN_VW
    const x  = window.innerWidth / 2 - sm - itemW / 2
    targetX.current         = x
    currentX.current        = x
    prevX.current           = x
    activeAbsIdxRef.current = 0
    setActiveAbsIdx(0)
    totalW.current          = n * slotW
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // ?? Snap ??????????????????????????????????????????????????????????????????
  const snapToNearest = () => {
    const n = countRef.current; if (!n) return
    const itemW  = window.innerWidth * ITEM_W
    const slotW  = itemW + GAP
    const sm     = window.innerWidth * SIDE_MARGIN_VW
    const viewCX = -currentX.current + window.innerWidth / 2
    const k = Math.round((viewCX - sm - itemW / 2) / slotW)
    targetX.current = window.innerWidth / 2 - sm - itemW / 2 - k * slotW
  }

  // ?? RAF loop ??????????????????????????????????????????????????????????????
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let raf, snapped = false
    const tick = () => {
      currentX.current += (targetX.current - currentX.current) * LERP
      const vel = currentX.current - prevX.current; prevX.current = currentX.current
      const t = totalW.current
      if (t > 0) {
        if (currentX.current < -t) { currentX.current += t; targetX.current += t }
        if (currentX.current >  0) { currentX.current -= t; targetX.current -= t }
      }
      const idle = Date.now() - lastScroll.current > SNAP_MS
      if (idle && Math.abs(vel) < 0.4 && !snapped) { snapped = true; snapToNearest() }
      else if (!idle) snapped = false
      const n = countRef.current; const total = totalItemsRef.current
      if (n > 0 && total > 0) {
        const itemW  = window.innerWidth * ITEM_W; const slotW = itemW + GAP
        const sm     = window.innerWidth * SIDE_MARGIN_VW
        const viewCX = -currentX.current + window.innerWidth / 2
        const nearest = Math.round((viewCX - sm - itemW / 2) / slotW)
        const absIdx  = ((nearest % total) + total) % total
        if (absIdx !== activeAbsIdxRef.current) { activeAbsIdxRef.current = absIdx; setActiveAbsIdx(absIdx) }
      }
      gsap.set(track, { x: Math.round(currentX.current) })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ?? Label ?????????????????????????????????????????????????????????????????
  const slideIdx = filtered.length > 0 ? activeAbsIdx % filtered.length : 0
  useEffect(() => {
    const slide = slidesRef.current[slideIdx]; if (!slide) return
    const num = String(slideIdx + 1).padStart(2, '0')
    const tot = String(slidesRef.current.length).padStart(2, '0')
    if (labelNumRef.current)   labelNumRef.current.textContent   = `${num} / ${tot}`
    if (labelTitleRef.current) labelTitleRef.current.textContent = slide.title || ''
    if (labelYearRef.current)  labelYearRef.current.textContent  = slide.year  || ''
    if (ghostNumRef.current)   ghostNumRef.current.textContent   = num
    if (labelRef.current && labelReadyRef.current) gsap.fromTo(labelRef.current,
      { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: 'expo.out' })
  }, [slideIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ?? Wheel ?????????????????????????????????????????????????????????????????
  useEffect(() => {
    const slider = sliderRef.current; if (!slider) return
    const onWheel = (e) => {
      e.preventDefault()
      targetX.current -= (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.85
      lastScroll.current = Date.now()
    }
    slider.addEventListener('wheel', onWheel, { passive: false })
    return () => slider.removeEventListener('wheel', onWheel)
  }, [])

  // ?? Mouse drag ????????????????????????????????????????????????????????????
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let dragging = false, startX = 0, startTX = 0
    const onDown = (e) => { dragging = true; startX = e.clientX; startTX = targetX.current; lastScroll.current = Date.now() }
    const onMove = (e) => { if (!dragging) return; targetX.current = startTX + (e.clientX - startX); lastScroll.current = Date.now() }
    const onUp   = () => { dragging = false }
    track.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { track.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ?? Touch ?????????????????????????????????????????????????????????????????
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let startX = 0, startY = 0, startTX = 0, isHorizontal = null
    const onStart = (e) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startTX = targetX.current
      isHorizontal = null
    }
    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (isHorizontal === null) isHorizontal = Math.abs(dx) > Math.abs(dy)
      if (isHorizontal) {
        e.preventDefault()
        targetX.current = startTX + dx
        lastScroll.current = Date.now()
      }
    }
    track.addEventListener('touchstart', onStart, { passive: true })
    track.addEventListener('touchmove',  onMove,  { passive: false })
    return () => { track.removeEventListener('touchstart', onStart); track.removeEventListener('touchmove', onMove) }
  }, [])

  // ?? Intro: hide filmstrip before first paint ???????????????????????????????
  useLayoutEffect(() => {
    if (!skipIntro && wrapRef.current) gsap.set(wrapRef.current, { opacity: 0 })
  }, [skipIntro])

  // ?? Intro: curtain fades out + filmstrip cascades in ?????????????????????
  useEffect(() => {
    if (!introComplete) return

    const cascade = () => {
      if (!wrapRef.current || !sliderRef.current) return
      gsap.set(wrapRef.current, { opacity: 1 })
      const all = wrapperRefsArr.current.filter(Boolean)
      if (!all.length) return

      if (!skipIntro) {
        // Suppress label until strip has settled
        labelReadyRef.current = false
        gsap.set(labelRef.current, { opacity: 0 })
      }

      // 1. Whole filmstrip slides in from the right like a reel loading
      gsap.fromTo(sliderRef.current,
        { x: 200, opacity: 0 },
        { x: 0, opacity: 1, duration: 1.85, ease: 'expo.out' }
      )

      // 2. Items stagger in left-to-right as the reel arrives
      gsap.fromTo(all,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.1,
          stagger: { each: 0.018, from: 'start' },
          ease: 'power2.inOut',
          onComplete() { gsap.set(all, { clearProps: 'opacity' }) },
        }
      )

      // 3. Label rises in after strip settles
      if (!skipIntro) {
        gsap.delayedCall(1.55, () => {
          labelReadyRef.current = true
          const n     = slidesRef.current.length
          const idx   = activeAbsIdxRef.current % Math.max(n, 1)
          const slide = slidesRef.current[idx]
          if (slide && labelRef.current) {
            const num = String(idx + 1).padStart(2, '0')
            const tot = String(n).padStart(2, '0')
            if (labelNumRef.current)   labelNumRef.current.textContent   = `${num} / ${tot}`
            if (labelTitleRef.current) labelTitleRef.current.textContent = slide.title || ''
            if (labelYearRef.current)  labelYearRef.current.textContent  = slide.year  || ''
            if (ghostNumRef.current)   ghostNumRef.current.textContent   = num
            gsap.fromTo(labelRef.current,
              { opacity: 0, y: 16 },
              { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }
            )
          }
        })
      }
    }

    if (skipIntro) { cascade(); return }

    _introPlayed = true
    cascade()
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 1.0, ease: 'power2.out',
      onComplete: () => setOverlayGone(true),
    })
  }, [introComplete, skipIntro])

  // ?? Category change ???????????????????????????????????????????????????????
  const handleCatChange = useCallback((newCat) => {
    if (newCat === cat || animatingRef.current) return

    animatingRef.current  = true
    catChangedRef.current = true
    reverseRef.current    = newCat === 'all'

    const slotW  = window.innerWidth * ITEM_W + GAP
    const itemW  = window.innerWidth * ITEM_W
    const sm     = window.innerWidth * SIDE_MARGIN_VW
    const buf    = window.innerWidth * 0.15
    const viewCX = window.innerWidth / 2

    // Capture visible wrappers, sorted by screen X
    const visible = wrapperRefsArr.current
      .map((el, i) => {
        if (!el) return null
        const rect = el.getBoundingClientRect()
        if (rect.right < -buf || rect.left > window.innerWidth + buf) return null
        const slide = repeated[i]
        return slide ? { el, rect, slide } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.rect.left - b.rect.left)

    // Find scroll anchor: item that should stay visually centered after transition
    const isAll      = newCat === 'all'
    const candidates = isAll
      ? visible
      : visible.filter(v => v.slide.category === newCat)

    const anchor = candidates.length
      ? candidates.reduce((b, v) =>
          Math.abs(v.rect.left + v.rect.width / 2 - viewCX) <
          Math.abs(b.rect.left + b.rect.width / 2 - viewCX) ? v : b
        )
      : visible.length
        ? visible.reduce((b, v) =>
            Math.abs(v.rect.left + v.rect.width / 2 - viewCX) <
            Math.abs(b.rect.left + b.rect.width / 2 - viewCX) ? v : b
          )
        : null

    if (anchor) {
      const targetArr = isAll
        ? allSlides
        : allSlides.filter(s => s.category === newCat)
      const anchorIdx = targetArr.findIndex(s => s._id === anchor.slide._id)
      if (anchorIdx !== -1) {
        const anchorCX = anchor.rect.left + anchor.rect.width / 2
        newScrollXRef.current = anchorCX - sm - itemW / 2 - anchorIdx * slotW
      }
    }

    // Dissolve the current track out
    const els = visible.map(v => v.el)
    if (els.length) {
      gsap.to(els, { opacity: 0, duration: 0.15, ease: 'expo.out' })
    }

    // Fire setCat after the dissolve ??new track fades in via enter animation
    setTimeout(() => { setCat(newCat); animatingRef.current = false }, 160)

  }, [cat, repeated, allSlides])

  // ?? Enter animation: set initial state before paint ???????????????????????
  useLayoutEffect(() => {
    if (!catChangedRef.current) return
    const all = wrapperRefsArr.current.filter(Boolean)
    all.forEach(el => gsap.set(el, { opacity: 0 }))
  }, [cat])

  // ?? Enter animation: fade items in ????????????????????????????????????????
  useEffect(() => {
    if (!catChangedRef.current) return
    const all = wrapperRefsArr.current.filter(Boolean)
    if (!all.length) return

    const buf     = window.innerWidth * 0.2
    const visible = all
      .map(el => ({ el, x: el.getBoundingClientRect().left }))
      .filter(({ x }) => x > -(buf + window.innerWidth * ITEM_W) && x < window.innerWidth + buf)
      .sort((a, b) => a.x - b.x)
      .map(({ el }) => el)

    const offscreen = all.filter(el => !visible.includes(el))
    if (offscreen.length) gsap.set(offscreen, { clearProps: 'opacity' })

    const targets = visible.length ? visible : all.slice(0, 10)

    if (reverseRef.current) {
      // Return to All: stagger from center outward ??feels like "expanding"
      gsap.to(targets, {
        opacity: 1,
        duration: 0.4,
        ease: 'expo.out',
        stagger: { each: 0.02, from: 'center' },
        onComplete() { gsap.set(all, { clearProps: 'opacity' }) },
      })
    } else {
      // Filter applied: all items snap in together ??clean, instant reveal
      gsap.to(targets, {
        opacity: 1,
        duration: 0.35,
        ease: 'expo.out',
        stagger: 0.012,
        onComplete() { gsap.set(all, { clearProps: 'opacity' }) },
      })
    }
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // ?????????????????????????????????????????????????????????????????????????
  return (
    <div ref={wrapRef} style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: '#000000' }}>

      {/* Loading overlay ??portalled to body so it's above Navbar regardless of stacking context */}
      {!skipIntro && !overlayGone && createPortal(
        <div ref={overlayRef} style={{
          position: 'fixed', inset: 0,
          background: '#000000',
          zIndex: 9999,
        }}>
          <video
            autoPlay muted playsInline preload="auto" disablePictureInPicture
            src="/loading-video.webm"
            onEnded={() => setAnimFinished(true)}
            onError={() => setAnimFinished(true)}
            onTimeUpdate={(e) => {
              const { currentTime, duration } = e.target
              if (duration && loadLineRef.current) {
                loadLineRef.current.style.transform = `scaleX(${currentTime / duration})`
              }
            }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: isMobile ? 'contain' : 'cover' }}
          />

          {/* Progress bar */}
          <div style={{
            position: 'absolute', bottom: '48px', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1, pointerEvents: 'none',
          }}>
            <div style={{
              width: '72px', height: '1px',
              background: 'rgba(240,236,230,0.15)',
              overflow: 'hidden',
            }}>
              <div ref={loadLineRef} style={{
                width: '100%', height: '100%',
                background: '#f0ece6',
                transformOrigin: 'left',
                transform: 'scaleX(0)',
              }} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Ghost index */}
      <div ref={ghostNumRef} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -46%)', zIndex: 0,
        pointerEvents: 'none', userSelect: 'none',
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: 'clamp(180px, 30vw, 420px)', fontWeight: 700,
        lineHeight: 1, letterSpacing: '-0.06em',
        color: 'rgba(240,236,230,0.025)',
      }} />

      {/* Filmstrip */}
      <div ref={sliderRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center',
        cursor: 'grab', userSelect: 'none', zIndex: 5,
        touchAction: 'pan-x',
      }}>
        <div ref={trackRef} style={{ display: 'flex', gap: `${GAP}px`, willChange: 'transform' }}>
          {repeated.map((slide, i) => (
            <div
              key={`wrap-${slide._id}-${i}`}
              ref={el => { wrapperRefsArr.current[i] = el }}
              style={{ flexShrink: 0 }}
            >
              <GalleryItem slide={slide} isActive={i === activeAbsIdx} />
            </div>
          ))}
        </div>
      </div>

      {/* Category filter — desktop only */}
      {!isMobile && (
        <div style={{
          position: 'absolute', bottom: '52px', left: '44px', zIndex: 20,
          display: 'flex', gap: '20px', alignItems: 'center',
        }}>
          {CATS.map(({ slug, label }) => (
            <button
              key={slug}
              onClick={() => handleCatChange(slug)}
              style={{
                fontFamily: '"Noto Sans Mono", monospace', fontSize: '9px',
                letterSpacing: '0.32em', textTransform: 'uppercase',
                color: cat === slug ? '#f0ece6' : '#333',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                transition: 'color 0.2s ease', lineHeight: 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Label */}
      <div ref={labelRef} style={{
        position: 'absolute', top: LABEL_Y, left: '50%',
        transform: 'translateX(-50%)', zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none', opacity: 0,
        whiteSpace: isMobile ? 'normal' : 'nowrap',
        maxWidth: isMobile ? '70vw' : 'none',
        textAlign: 'center',
      }}>
        <p ref={labelNumRef}   style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: '8px', letterSpacing: '0.5em', color: '#2e2e2e', marginBottom: 14, textAlign: 'center' }} />
        <div style={{ width: '1px', height: '20px', background: 'rgba(240,236,230,0.1)', marginBottom: 14 }} />
        <p ref={labelTitleRef} style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: isMobile ? '0.95rem' : 'clamp(0.85rem, 1.5vw, 1.2rem)', fontStyle: 'italic', fontWeight: 300, letterSpacing: '0.02em', color: '#f0ece6', lineHeight: 1.2, marginBottom: 12, textAlign: 'center' }} />
        <p ref={labelYearRef}  style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: '8px', letterSpacing: '0.45em', color: '#2e2e2e', textAlign: 'center' }} />
      </div>

    </div>
  )
}
