import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { animate } from 'framer-motion'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'

const GAP      = 12
const V_GAP    = 2
const LERP     = 0.11
const SNAP_MS  = 200

const _mob           = typeof window !== 'undefined' && window.innerWidth < 768
const ITEM_W         = _mob ? 0.58  : 0.16
const ITEM_H_VH      = _mob ? 52    : 36
const ACTIVE_SCALE   = 1
const ITEM_H         = `${ITEM_H_VH}vh`
const SIDE_MARGIN_VW = 0
const EXTRA_GAP_VW   = 0
const SM_TOTAL_VW    = 0
const SM_STR         = '0px'
const V_ITEM_W       = _mob ? 0.58 : 0.10
const V_ITEM_H_VH    = _mob ? 26   : 22
const V_ITEM_H       = `${V_ITEM_H_VH}vh`
const V_ACTIVE_SCALE = 1
const SIDE_MARGIN_VH = 0
const V_EXTRA_GAP_VH = 0
const SM_TOTAL_VH    = 0
const SM_V_STR       = '0px'
const LABEL_Y        = `calc(50vh + ${(ITEM_H_VH / 2).toFixed(1)}vh + 32px)`
const V_LABEL_LEFT   = `calc(50% + ${(V_ITEM_W * 50).toFixed(2)}vw + 24px)`

const GLOBE_PEAK     = 1.22   // scale of item at viewport center
const GLOBE_EDGE     = 0.78   // scale of items far from center
const GLOBE_FALLOFF  = 0.52   // fraction of viewport width: items this far out reach GLOBE_EDGE

// How long to block scrolling / keep mode-transitioning class active.
// Must be >= max(spring settle time, GSAP scale duration) + max stagger delay.
const FLIP_TOTAL_DUR = 1.0   // seconds

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

// ── Gallery item ──────────────────────────────────────────────────────────────
// CSS transitions are always present here; they are suppressed during mode-switch
// by the .mode-transitioning class added to sliderRef (see handleModeToggle).
const GalleryItem = memo(function GalleryItem({ slide, isActive, mode = 'h' }) {
  return (
    <div
      style={{
        flexShrink:      0,
        width:           mode === 'v' ? `${V_ITEM_W * 100}vw` : `${ITEM_W * 100}vw`,
        height:          mode === 'v' ? V_ITEM_H : ITEM_H,
        overflow:        'hidden',
        cursor:          'pointer',
        transition:      'opacity 0.35s ease',
        opacity:         isActive ? 1 : 0.28,
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

// ── Hero ──────────────────────────────────────────────────────────────────────
export default function Hero() {
  const skipIntro = _introPlayed
  const isMobile  = useIsMobile()
  const navigate  = useNavigate()

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
  const lineRef       = useRef(null)   // single line that rotates 90° on mode toggle

  const targetX         = useRef(0)
  const currentX        = useRef(0)
  const prevX           = useRef(0)
  const totalW          = useRef(0)
  const countRef        = useRef(0)
  const totalItemsRef   = useRef(0)
  const slidesRef       = useRef([])
  const activeAbsIdxRef = useRef(0)
  const lastScroll      = useRef(0)

  const [mode, setMode]           = useState('h')
  const modeRef                   = useRef('h')
  const transitioningRef          = useRef(false)
  const targetYRef                = useRef(0)
  const currentYRef               = useRef(0)
  const prevYRef                  = useRef(0)
  const totalH                    = useRef(0)
  const [flipRects, setFlipRects] = useState(null)

  const wrapperRefsArr = useRef([])
  const catChangedRef  = useRef(false)
  const animatingRef   = useRef(false)
  const reverseRef     = useRef(false)
  const newScrollXRef  = useRef(null)
  const labelReadyRef  = useRef(skipIntro)

  // ── Text reveal helper ────────────────────────────────────────────────────
  const showLabel = useCallback((idx) => {
    const slide = slidesRef.current[idx]
    if (!slide) return
    const num = String(idx + 1).padStart(2, '0')
    const tot = String(slidesRef.current.length).padStart(2, '0')
    if (labelNumRef.current)   labelNumRef.current.textContent   = `${num} / ${tot}`
    if (labelTitleRef.current) labelTitleRef.current.textContent = slide.title || ''
    if (labelYearRef.current)  labelYearRef.current.textContent  = slide.year  || ''
    if (ghostNumRef.current)   ghostNumRef.current.textContent   = num
    if (!labelRef.current) return
    gsap.set(labelRef.current, { opacity: 1 })
    const rows = [labelNumRef.current, labelTitleRef.current, labelYearRef.current].filter(Boolean)
    gsap.fromTo(rows,
      { yPercent: 110, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.07 }
    )
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    client.fetch(
      `*[_type == "project"] | order(orderRank asc, _createdAt desc)
       { _id, title, year, category, coverImage, images }`
    ).then(data => {
      setProjects(data)
      setDataLoaded(true)
    }).catch(() => setDataLoaded(true))
  }, [])

  // ── Slides ────────────────────────────────────────────────────────────────
  const allSlides = useMemo(() => {
    const seen   = new Set()
    const slides = []
    for (const p of projects) {
      const category = (p.category || '').replace('.', '').toLowerCase()
      const base     = { projectId: p._id, title: p.title, year: p.year, category }
      const coverRef = p.coverImage?.asset?._ref
      if (!coverRef || seen.has(coverRef)) continue
      seen.add(coverRef)
      slides.push({ ...base, _id: `${p._id}-${coverRef}`, imageRef: coverRef })
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

  // ── totalW ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => { totalW.current = countRef.current * (window.innerWidth * ITEM_W + GAP) }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [filtered.length])

  // ── Scroll reset on category change ───────────────────────────────────────
  useEffect(() => {
    const itemW = window.innerWidth * ITEM_W
    const slotW = itemW + GAP
    const n     = filtered.length
    if (newScrollXRef.current !== null && n > 0) {
      const x    = newScrollXRef.current
      const smPx = window.innerWidth * SM_TOTAL_VW
      const viewCX = -x + window.innerWidth / 2
      const raw    = Math.round((viewCX - smPx - itemW / 2) / slotW)
      const idx    = Math.max(0, Math.min(n - 1, ((raw % n) + n) % n))
      targetX.current = x; currentX.current = x; prevX.current = x
      activeAbsIdxRef.current = idx; setActiveAbsIdx(idx)
      totalW.current = n * slotW; newScrollXRef.current = null
      return
    }
    const smPx = window.innerWidth * SM_TOTAL_VW
    const x    = window.innerWidth / 2 - smPx - itemW / 2
    targetX.current = x; currentX.current = x; prevX.current = x
    activeAbsIdxRef.current = 0; setActiveAbsIdx(0)
    totalW.current = n * slotW
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── totalH ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => { totalH.current = countRef.current * (window.innerHeight * V_ITEM_H_VH / 100 + V_GAP) }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [filtered.length])

  const snapToNearest = () => {
    const n = countRef.current; if (!n) return
    const vw = window.innerWidth
    const itemW = vw * ITEM_W; const slotW = itemW + GAP
    const smPx  = vw * SM_TOTAL_VW
    const viewCX = -currentX.current + vw / 2
    const k = Math.round((viewCX - smPx - itemW / 2) / slotW)
    targetX.current = vw / 2 - smPx - itemW / 2 - k * slotW
  }

  const snapToNearestV = () => {
    const n = countRef.current; if (!n) return
    const vh = window.innerHeight
    const itemH = vh * V_ITEM_H_VH / 100; const slotH = itemH + V_GAP
    const smPx  = vh * SM_TOTAL_VH
    const viewCY = -currentYRef.current + vh / 2
    const k = Math.round((viewCY - smPx - itemH / 2) / slotH)
    targetYRef.current = vh / 2 - smPx - itemH / 2 - k * slotH
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let raf, snapped = false
    const tick = () => {
      if (transitioningRef.current) { raf = requestAnimationFrame(tick); return }
      const n = countRef.current; const total = totalItemsRef.current
      const idle = Date.now() - lastScroll.current > SNAP_MS
      if (modeRef.current === 'h') {
        currentX.current += (targetX.current - currentX.current) * LERP
        const vel = currentX.current - prevX.current; prevX.current = currentX.current
        const t = totalW.current
        if (t > 0) {
          if (currentX.current < -t) { currentX.current += t; targetX.current += t }
          if (currentX.current >  0) { currentX.current -= t; targetX.current -= t }
        }
        if (idle && Math.abs(vel) < 0.4 && !snapped) { snapped = true; snapToNearest() }
        else if (!idle) snapped = false
        if (n > 0 && total > 0) {
          const itemW  = window.innerWidth * ITEM_W; const slotW = itemW + GAP
          const smPx   = window.innerWidth * SM_TOTAL_VW
          const viewCX = -currentX.current + window.innerWidth / 2
          const nearest = Math.round((viewCX - smPx - itemW / 2) / slotW)
          const absIdx  = ((nearest % total) + total) % total
          if (absIdx !== activeAbsIdxRef.current) { activeAbsIdxRef.current = absIdx; setActiveAbsIdx(absIdx) }
        }
        const vw = window.innerWidth
        const cx = vw / 2
        const iW = vw * ITEM_W
        const sW = iW + GAP
        const fallPx = vw * GLOBE_FALLOFF
        Array.from(track.children).forEach((child, i) => {
          const itemCX = currentX.current + i * sW + iW / 2
          const dist = Math.abs(itemCX - cx)
          const t = Math.pow(Math.max(0, 1 - dist / fallPx), 1.8)
          child.style.transform = `scale(${(GLOBE_EDGE + (GLOBE_PEAK - GLOBE_EDGE) * t).toFixed(4)})`
        })
        gsap.set(track, { x: Math.round(currentX.current), y: 0 })
      } else {
        currentYRef.current += (targetYRef.current - currentYRef.current) * LERP
        const vel = currentYRef.current - prevYRef.current; prevYRef.current = currentYRef.current
        const t = totalH.current
        if (t > 0) {
          if (currentYRef.current < -t) { currentYRef.current += t; targetYRef.current += t }
          if (currentYRef.current >  0) { currentYRef.current -= t; targetYRef.current -= t }
        }
        if (idle && Math.abs(vel) < 0.4 && !snapped) { snapped = true; snapToNearestV() }
        else if (!idle) snapped = false
        if (n > 0 && total > 0) {
          const itemH  = window.innerHeight * V_ITEM_H_VH / 100; const slotH = itemH + V_GAP
          const smPx   = window.innerHeight * SM_TOTAL_VH
          const viewCY = -currentYRef.current + window.innerHeight / 2
          const nearest = Math.round((viewCY - smPx - itemH / 2) / slotH)
          const absIdx  = ((nearest % total) + total) % total
          if (absIdx !== activeAbsIdxRef.current) { activeAbsIdxRef.current = absIdx; setActiveAbsIdx(absIdx) }
        }
        gsap.set(track, { x: 0, y: Math.round(currentYRef.current) })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Label: slide-change reveal ────────────────────────────────────────────
  const slideIdx = filtered.length > 0 ? activeAbsIdx % filtered.length : 0
  useEffect(() => {
    if (ghostNumRef.current) ghostNumRef.current.textContent = String(slideIdx + 1).padStart(2, '0')
    if (labelReadyRef.current) showLabel(slideIdx)
  }, [slideIdx, showLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const slider = sliderRef.current; if (!slider) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.85
      if (modeRef.current === 'h') targetX.current   -= delta
      else                         targetYRef.current -= delta
      lastScroll.current = Date.now()
    }
    slider.addEventListener('wheel', onWheel, { passive: false })
    return () => slider.removeEventListener('wheel', onWheel)
  }, [])

  // ── Mouse drag ────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let dragging = false, startX = 0, startY = 0, startTX = 0, startTY = 0
    const onDown = (e) => {
      e.preventDefault()
      dragging = true; startX = e.clientX; startY = e.clientY
      startTX = targetX.current; startTY = targetYRef.current
      lastScroll.current = Date.now()
    }
    const onMove = (e) => {
      if (!dragging) return
      if (modeRef.current === 'h') targetX.current   = startTX + (e.clientX - startX)
      else                         targetYRef.current = startTY + (e.clientY - startY)
      lastScroll.current = Date.now()
    }
    const onUp = () => { dragging = false }
    track.addEventListener('mousedown', onDown, { passive: false })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { track.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Touch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let startX = 0, startY = 0, startTX = 0, startTY = 0, axis = null
    const onStart = (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY
      startTX = targetX.current; startTY = targetYRef.current; axis = null
    }
    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX; const dy = e.touches[0].clientY - startY
      if (axis === null) axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (modeRef.current === 'h' && axis === 'h') { e.preventDefault(); targetX.current   = startTX + dx; lastScroll.current = Date.now() }
      else if (modeRef.current === 'v' && axis === 'v') { e.preventDefault(); targetYRef.current = startTY + dy; lastScroll.current = Date.now() }
    }
    track.addEventListener('touchstart', onStart, { passive: true })
    track.addEventListener('touchmove',  onMove,  { passive: false })
    return () => { track.removeEventListener('touchstart', onStart); track.removeEventListener('touchmove', onMove) }
  }, [])

  // ── FLIP ─────────────────────────────────────────────────────────────────
  // Strategy: each item springs from its old screen position to its new one
  // while GSAP simultaneously morphs the child's size. All CSS transitions on
  // GalleryItem children are suppressed via .mode-transitioning class for the
  // full FLIP_TOTAL_DUR duration — preventing any secondary CSS animations
  // from firing when GSAP's intermediate transform values are on the DOM.
  useLayoutEffect(() => {
    if (!flipRects) return

    const track = trackRef.current
    if (track) {
      if (modeRef.current === 'v') gsap.set(track, { x: 0, y: Math.round(currentYRef.current) })
      else                         gsap.set(track, { x: Math.round(currentX.current), y: 0 })
    }

    const isNowV = modeRef.current === 'v'

    // Active item: uniform scale morph to match its new visual size
    const scaleActFrom = isNowV
      ? ACTIVE_SCALE   * (ITEM_W / V_ITEM_W)      // H→V: appear as H active width
      : V_ACTIVE_SCALE * (V_ITEM_W / ITEM_W)      // V→H: appear as V active width
    const scaleActTo = isNowV ? V_ACTIVE_SCALE : ACTIVE_SCALE

    // Inactive items: uniform scale so both width AND height morph together.
    // scaleX-only was leaving height at the snapped new value while width animated,
    // causing the wrong aspect ratio on first frame. Width/height ratios are close
    // enough (16vw/36vh ≈ 10vw/22vh ≈ 0.44) that uniform scale looks correct.
    const scaleInactFrom = isNowV ? ITEM_W / V_ITEM_W : V_ITEM_W / ITEM_W

    flipRects.forEach(({ el, centerX, centerY, isActive }, i) => {
      if (!el) return

      gsap.set(el, { clearProps: 'transform' })
      const r  = el.getBoundingClientRect()
      const dx = centerX - (r.left + r.width  / 2)
      const dy = centerY - (r.top  + r.height / 2)
      const delay = i * 0.025

      // Size morph — same approach for active and inactive: uniform scale
      const child = el.firstChild
      if (child) {
        const scaleFrom = isActive ? scaleActFrom : scaleInactFrom
        const scaleTo   = isActive ? scaleActTo   : 1
        gsap.fromTo(child,
          { scale: scaleFrom, transformOrigin: 'center center' },
          { scale: scaleTo,   duration: 0.75, ease: 'power2.inOut', delay }
        )
      }

      if (Math.abs(dx) >= 2 || Math.abs(dy) >= 2) {
        animate(el,
          { x: [dx, 0], y: [dy, 0] },
          {
            type:      'spring',
            stiffness: 280,
            damping:   30,
            mass:      0.65,
            delay,
            onComplete: () => gsap.set(el, { clearProps: 'transform' }),
          }
        )
      }
    })

    // Single guaranteed cleanup after ALL animations (spring + GSAP scale) finish.
    // This avoids the race condition where spring completes before GSAP scale,
    // causing CSS transitions to re-enable mid-animation and stutter.
    gsap.delayedCall(FLIP_TOTAL_DUR, () => {
      if (sliderRef.current) sliderRef.current.classList.remove('mode-transitioning')
      transitioningRef.current = false
      const n   = slidesRef.current.length
      const idx = activeAbsIdxRef.current % Math.max(n, 1)
      showLabel(idx)
    })

    setFlipRects(null)
  }, [flipRects, showLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const handleModeToggle = useCallback(() => {
    if (transitioningRef.current) return
    transitioningRef.current = true

    const newMode = modeRef.current === 'h' ? 'v' : 'h'
    const vw = window.innerWidth; const vh = window.innerHeight
    const itemW  = vw * ITEM_W
    const vItemH = vh * V_ITEM_H_VH / 100
    const slotW  = itemW + GAP
    const slotH  = vItemH + V_GAP
    const activeIdx = activeAbsIdxRef.current

    let rects
    if (newMode === 'v') {
      rects = wrapperRefsArr.current
        .map((el, i) => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) return null
          return { el, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2, isActive: i === activeIdx }
        })
        .filter(Boolean)
    } else {
      const visibleRadius = Math.ceil((vw / 2 + itemW) / slotW) + 1
      rects = wrapperRefsArr.current
        .map((el, i) => {
          if (!el) return null
          if (Math.abs(i - activeIdx) > visibleRadius) return null
          const r = el.getBoundingClientRect()
          const inV = r.right >= 0 && r.left <= vw && r.bottom >= 0 && r.top <= vh
          if (inV) return { el, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2, isActive: i === activeIdx }
          const rawY    = currentYRef.current + i * slotH + vItemH / 2
          const clampedY = i < activeIdx ? Math.max(-(vItemH / 2), rawY) : Math.min(vh + vItemH / 2, rawY)
          return { el, centerX: vw / 2, centerY: clampedY, isActive: i === activeIdx }
        })
        .filter(Boolean)
    }

    rects.sort((a, b) => {
      const da = Math.abs(a.centerX - vw / 2) + Math.abs(a.centerY - vh / 2)
      const db = Math.abs(b.centerX - vw / 2) + Math.abs(b.centerY - vh / 2)
      return da - db
    })

    if (newMode === 'v') {
      const smVPx = vh * SM_TOTAL_VH
      const newY  = vh / 2 - smVPx - vItemH / 2 - activeIdx * slotH
      targetYRef.current = newY; currentYRef.current = newY; prevYRef.current = newY
      totalH.current = countRef.current * slotH
    } else {
      const smPx = vw * SM_TOTAL_VW
      const newX = vw / 2 - smPx - itemW / 2 - activeIdx * slotW
      targetX.current = newX; currentX.current = newX; prevX.current = newX
    }

    // Hide label immediately — showLabel() reveals it after FLIP_TOTAL_DUR
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })

    // Single line rotates 90deg: vertical (0deg) in H mode, horizontal (90deg) in V mode
    if (lineRef.current) {
      gsap.to(lineRef.current, {
        rotate:   newMode === 'v' ? 90 : 0,
        duration: FLIP_TOTAL_DUR * 0.75,
        ease:     'power2.inOut',
      })
    }

    modeRef.current = newMode

    // Add class BEFORE React re-render so children have transitions disabled
    // for the entire FLIP duration. Removed after FLIP_TOTAL_DUR in useLayoutEffect.
    if (sliderRef.current) sliderRef.current.classList.add('mode-transitioning')

    setMode(newMode)
    setFlipRects(rects)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click → work page zoom ────────────────────────────────────────────────
  const handleItemClick = useCallback((slide, wrapperEl) => {
    if (transitioningRef.current) return
    const itemEl = wrapperEl?.firstChild
    const rect   = itemEl?.getBoundingClientRect()
    if (!rect || rect.width < 10) { navigate(`/work/${slide.projectId}`); return }
    const vw = window.innerWidth; const vh = window.innerHeight
    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9998;background:#000000;overflow:hidden;pointer-events:none;'
    const img = document.createElement('img')
    img.src = imageUrl(slide.imageRef)
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;'
    overlay.appendChild(img); document.body.appendChild(overlay)
    const scale = rect.width / vw
    const tx    = (rect.left + rect.width  / 2) - vw / 2
    const ty    = (rect.top  + rect.height / 2) - vh / 2
    gsap.set(img, { x: tx, y: ty, scale, transformOrigin: 'center center' })
    gsap.to(img, {
      x: 0, y: 0, scale: 1, duration: 0.62, ease: 'power3.inOut',
      onComplete: () => {
        navigate(`/work/${slide.projectId}`)
        gsap.to(overlay, { opacity: 0, duration: 0.4, delay: 0.22, onComplete: () => overlay.remove() })
      },
    })
  }, [navigate])

  // ── Init decorative lines ─────────────────────────────────────────────────
  useLayoutEffect(() => {
    // H mode = 0deg (vertical), V mode = 90deg (horizontal)
    if (lineRef.current) gsap.set(lineRef.current, { xPercent: -50, yPercent: -50, rotate: 0 })
  }, [])

  // ── Intro: hide filmstrip before first paint ──────────────────────────────
  useLayoutEffect(() => {
    if (!skipIntro && wrapRef.current) gsap.set(wrapRef.current, { opacity: 0 })
  }, [skipIntro])

  // ── Intro: curtain + cascade ──────────────────────────────────────────────
  useEffect(() => {
    if (!introComplete) return
    const cascade = () => {
      if (!wrapRef.current || !sliderRef.current) return
      gsap.set(wrapRef.current, { opacity: 1 })
      const all = wrapperRefsArr.current.filter(Boolean)
      if (!all.length) return
      gsap.fromTo(sliderRef.current, { x: 200, opacity: 0 }, { x: 0, opacity: 1, duration: 1.85, ease: 'expo.out' })
      gsap.fromTo(all, { opacity: 0 }, {
        opacity: 1, duration: 1.1, stagger: { each: 0.018, from: 'start' }, ease: 'power2.inOut',
        onComplete() { gsap.set(all, { clearProps: 'opacity' }) },
      })
    }
    if (skipIntro) { cascade(); return }
    _introPlayed = true
    labelReadyRef.current = false
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.7, ease: 'power2.out',
      onComplete: () => {
        setOverlayGone(true)
        if (!wrapRef.current || !sliderRef.current) return
        const all = wrapperRefsArr.current.filter(Boolean)
        if (all.length) gsap.set(all, { clearProps: 'opacity' })
        gsap.set(wrapRef.current, { opacity: 1 })
        gsap.fromTo(sliderRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
        gsap.delayedCall(0.4, () => {
          labelReadyRef.current = true
          const n   = slidesRef.current.length
          const idx = activeAbsIdxRef.current % Math.max(n, 1)
          showLabel(idx)
        })
      },
    })
  }, [introComplete, skipIntro, showLabel])

  // ── Category change ───────────────────────────────────────────────────────
  const handleCatChange = useCallback((newCat) => {
    if (newCat === cat || animatingRef.current) return
    animatingRef.current = true; catChangedRef.current = true; reverseRef.current = newCat === 'all'
    const slotW  = window.innerWidth * ITEM_W + GAP
    const itemW  = window.innerWidth * ITEM_W
    const smPx   = window.innerWidth * SM_TOTAL_VW
    const buf    = window.innerWidth * 0.15
    const viewCX = window.innerWidth / 2
    const visible = wrapperRefsArr.current
      .map((el, i) => {
        if (!el) return null
        const rect = el.getBoundingClientRect()
        if (rect.right < -buf || rect.left > window.innerWidth + buf) return null
        const slide = repeated[i]
        return slide ? { el, rect, slide } : null
      })
      .filter(Boolean).sort((a, b) => a.rect.left - b.rect.left)
    const isAll = newCat === 'all'
    const candidates = isAll ? visible : visible.filter(v => v.slide.category === newCat)
    const anchor = candidates.length
      ? candidates.reduce((b, v) => Math.abs(v.rect.left + v.rect.width / 2 - viewCX) < Math.abs(b.rect.left + b.rect.width / 2 - viewCX) ? v : b)
      : visible.length
        ? visible.reduce((b, v) => Math.abs(v.rect.left + v.rect.width / 2 - viewCX) < Math.abs(b.rect.left + b.rect.width / 2 - viewCX) ? v : b)
        : null
    if (anchor) {
      const targetArr = isAll ? allSlides : allSlides.filter(s => s.category === newCat)
      const anchorIdx = targetArr.findIndex(s => s._id === anchor.slide._id)
      if (anchorIdx !== -1) {
        const anchorCX = anchor.rect.left + anchor.rect.width / 2
        newScrollXRef.current = anchorCX - smPx - itemW / 2 - anchorIdx * slotW
      }
    }
    const els = visible.map(v => v.el)
    if (els.length) gsap.to(els, { opacity: 0, duration: 0.15, ease: 'expo.out' })
    setTimeout(() => { setCat(newCat); animatingRef.current = false }, 160)
  }, [cat, repeated, allSlides])

  // ── Enter animation ───────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!catChangedRef.current) return
    wrapperRefsArr.current.filter(Boolean).forEach(el => gsap.set(el, { opacity: 0 }))
  }, [cat])

  useEffect(() => {
    if (!catChangedRef.current) return
    const all = wrapperRefsArr.current.filter(Boolean); if (!all.length) return
    const buf     = window.innerWidth * 0.2
    const visible = all
      .map(el => ({ el, x: el.getBoundingClientRect().left }))
      .filter(({ x }) => x > -(buf + window.innerWidth * ITEM_W) && x < window.innerWidth + buf)
      .sort((a, b) => a.x - b.x).map(({ el }) => el)
    const offscreen = all.filter(el => !visible.includes(el))
    if (offscreen.length) gsap.set(offscreen, { clearProps: 'opacity' })
    const targets = visible.length ? visible : all.slice(0, 10)
    if (reverseRef.current) {
      gsap.to(targets, { opacity: 1, duration: 0.4, ease: 'expo.out', stagger: { each: 0.02, from: 'center' }, onComplete() { gsap.set(all, { clearProps: 'opacity' }) } })
    } else {
      gsap.to(targets, { opacity: 1, duration: 0.35, ease: 'expo.out', stagger: 0.012, onComplete() { gsap.set(all, { clearProps: 'opacity' }) } })
    }
  }, [cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: '#000000' }}>

      {!skipIntro && !overlayGone && createPortal(
        <div ref={overlayRef} style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 9999 }}>
          <video autoPlay muted playsInline preload="auto" disablePictureInPicture
            src="/loading-video.webm"
            onEnded={() => setAnimFinished(true)} onError={() => setAnimFinished(true)}
            onTimeUpdate={(e) => { const { currentTime, duration } = e.target; if (duration && loadLineRef.current) loadLineRef.current.style.transform = `scaleX(${currentTime / duration})` }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: isMobile ? 'contain' : 'cover' }}
          />
          <div style={{ position: 'absolute', bottom: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 1, pointerEvents: 'none' }}>
            <div style={{ width: '72px', height: '1px', background: 'rgba(240,236,230,0.15)', overflow: 'hidden' }}>
              <div ref={loadLineRef} style={{ width: '100%', height: '100%', background: '#f0ece6', transformOrigin: 'left', transform: 'scaleX(0)' }} />
            </div>
          </div>
        </div>, document.body
      )}

      <div ref={ghostNumRef} style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -46%)', zIndex: 0,
        pointerEvents: 'none', userSelect: 'none', fontFamily: '"Noto Sans Mono", monospace',
        fontSize: 'clamp(180px, 30vw, 420px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.06em',
        color: 'rgba(240,236,230,0.025)',
      }} />

      {!isMobile && (
        // Single 1px line centred at 50vw/50vh, long enough to span the viewport
        // in any rotation. GSAP rotates it between 0deg (vertical, H mode) and
        // 90deg (horizontal, V mode) — one smooth motion through the centre.
        <div ref={lineRef} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '1px', height: 'max(100vw, 100vh)',
          background: 'rgba(240,236,230,0.07)',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}

      <div ref={sliderRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        alignItems:     mode === 'v' ? 'flex-start' : 'center',
        justifyContent: mode === 'v' ? 'center'     : 'flex-start',
        cursor: 'grab', userSelect: 'none', zIndex: 5,
        touchAction: mode === 'v' ? 'pan-y' : 'pan-x',
      }}>
        <div ref={trackRef} style={{
          display: 'flex', flexDirection: mode === 'v' ? 'column' : 'row',
          gap: mode === 'v' ? `${V_GAP}px` : `${GAP}px`, willChange: 'transform',
        }}>
          {repeated.map((slide, i) => (
            <div
              key={`wrap-${slide._id}-${i}`}
              ref={el => { wrapperRefsArr.current[i] = el }}
              style={{ flexShrink: 0 }}
              onClick={() => handleItemClick(slide, wrapperRefsArr.current[i])}
            >
              <GalleryItem slide={slide} isActive={i === activeAbsIdx} mode={mode} />
            </div>
          ))}
        </div>
      </div>

      {!isMobile && (
        <button onClick={handleModeToggle} style={{
          position: 'absolute', bottom: '52px', right: '44px', zIndex: 20,
          background: 'none', border: 'none', padding: '8px',
          cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
        }}>
          {mode === 'h' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="0" x2="7" y2="14" stroke="rgba(240,236,230,0.4)" strokeWidth="1"/>
              <line x1="3" y1="3" x2="3" y2="11" stroke="rgba(240,236,230,0.2)" strokeWidth="1"/>
              <line x1="11" y1="3" x2="11" y2="11" stroke="rgba(240,236,230,0.2)" strokeWidth="1"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="0" y1="7" x2="14" y2="7" stroke="rgba(240,236,230,0.4)" strokeWidth="1"/>
              <line x1="3" y1="3" x2="11" y2="3" stroke="rgba(240,236,230,0.2)" strokeWidth="1"/>
              <line x1="3" y1="11" x2="11" y2="11" stroke="rgba(240,236,230,0.2)" strokeWidth="1"/>
            </svg>
          )}
        </button>
      )}

      <div style={{
        position: 'absolute', zIndex: 20, pointerEvents: 'none',
        transition: isMobile ? 'none' : 'top 0.5s cubic-bezier(0.16,1,0.3,1), left 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        ...(isMobile
          ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)', left: 0, right: 0 }
          : mode === 'v'
            ? { top: '50%', left: V_LABEL_LEFT, transform: 'translateY(-50%)' }
            : { top: LABEL_Y, left: 0, right: 0, transform: 'none' }),
      }}>
        <div ref={labelRef} style={{
          display: 'flex', flexDirection: 'column',
          alignItems: (!isMobile && mode === 'v') ? 'flex-start' : 'center',
          opacity: 0,
        }}>
          <div style={{ overflow: 'hidden' }}>
            <p ref={labelTitleRef} style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: isMobile ? '0.95rem' : 'clamp(0.85rem, 1.5vw, 1.2rem)', fontStyle: 'italic', fontWeight: 300, letterSpacing: '0.02em', color: '#f0ece6', lineHeight: 1.2, marginBottom: 12 }} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p ref={labelYearRef} style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: '8px', letterSpacing: '0.45em', color: '#2e2e2e' }} />
          </div>
        </div>
      </div>

    </div>
  )
}
