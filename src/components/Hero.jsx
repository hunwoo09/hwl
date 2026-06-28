import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { AnimatePresence, motion, animate } from 'framer-motion'
import { client } from '../sanityClient'
import { useIsMobile } from '../hooks/useIsMobile'
import HeroCanvas from './HeroCanvas'

const GAP            = 12
const V_GAP_PX       = 32   // gap between V-mode images when not hovering list (px)
const V_GAP_HOVER_VH = 20   // gap when hovering list (vh) — large enough for 1.7× scale
const LERP           = 0.11
const SNAP_MS        = 200
const FLIP_TOTAL_DUR = 1.0  // seconds — spring + GSAP scale settle time

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
const LABEL_Y           = `calc(50vh + ${(ITEM_H_VH / 2).toFixed(1)}vh + 32px)`
const V_LABEL_LEFT      = `calc(50% + ${(V_ITEM_W * 50).toFixed(2)}vw + 24px)`
const V_LIST_W_VW       = 42
const V_LIST_IMG_CX_VW  = (100 - V_LIST_W_VW) / 2
const V_LIST_LABEL_LEFT = `calc(${(V_LIST_IMG_CX_VW + V_ITEM_W * 50).toFixed(2)}vw + 24px)`


let _introPlayed = false
let _persistedMode = 'h'   // survives navigation so back-button returns to same mode
export function resetIntro() { _introPlayed = false }

// Compute per-item slot widths and cumulative positions for variable-width H-mode layout.
// widths[i]    = image display width in px = aspectRatio * ITEM_H_PX
// positions[i] = left edge of slot i (sum of all prior slot widths + gaps)
// total        = full cycle width (one pass through all slides)
function computeSlotData(slides, itemHPx) {
  const widths = slides.map(s => (s.aspectRatio ?? 1) * itemHPx)
  const positions = []
  let acc = 0
  for (const w of widths) {
    positions.push(acc)
    acc += w + GAP
  }
  return { widths, positions, total: acc || 0 }
}

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
const GalleryItem = memo(function GalleryItem({ slide, isActive, mode = 'h', listHovered = false }) {
  return (
    <div
      style={{
        flexShrink: 0,
        // H mode: container sized to exact image aspect ratio × row height → no cropping, no distortion
        width:      mode === 'v' ? `${V_ITEM_W * 100}vw` : `${(slide.aspectRatio ?? 1) * ITEM_H_VH}vh`,
        height:     mode === 'v' ? V_ITEM_H : ITEM_H,
        overflow:   'hidden',
        cursor:     'pointer',
        opacity:    isActive ? 1 : 0.28,
        transform:  (mode === 'v' && listHovered) ? 'scale(1.7)' : 'scale(1)',
        transition: 'opacity 0.35s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {slide.imageRef ? (
        <img
          src={imageUrl(slide.imageRef)}
          alt={slide.title}
          draggable={false}
          style={{
            width:         '100%',
            height:        '100%',
            display:       'block',
            objectFit:     mode === 'h' ? 'cover' : 'contain',
            userSelect:    'none',
            pointerEvents: 'none',
          }}
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
  const [flipRects,    setFlipRects]   = useState(null)

  const introComplete = dataLoaded && animFinished

  const wrapRef       = useRef(null)
  const hSliderRef    = useRef(null)   // canvas container (H-mode)
  const sliderRef     = useRef(null)   // DOM slider container (V-mode)
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

  const slotWidthsRef   = useRef([])   // px width of each image: aspectRatio[i] * ITEM_H_PX
  const slotPositionsRef = useRef([])  // cumulative left edge: [0, w0+GAP, w0+GAP+w1+GAP, ...]

  const [mode, setMode]             = useState(_persistedMode)
  const modeRef                     = useRef(_persistedMode)
  const transitioningRef            = useRef(false)
  const targetYRef                  = useRef(0)
  const currentYRef                 = useRef(0)
  const prevYRef                    = useRef(0)
  const totalH                      = useRef(0)
  const vGapRef                     = useRef(V_GAP_PX)
  const [hoveredListIdx, setHoveredListIdx] = useState(null)

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
       { _id, title, year, category,
         description, medium, location, website, credits, softwares,
         coverImage { "assetRef": asset._ref, asset->{ metadata { dimensions { aspectRatio } } } },
         images,
         videoFile { asset { _ref } },
         videos[] { asset { _ref } },
         glbFile   { asset { _ref } },
         codeFiles }`
    ).then(data => {
      setProjects(data)
      setDataLoaded(true)
    }).catch(() => setDataLoaded(true))
  }, [])

  // _id → full project object (used by WorkOverlay)
  const projectsMap = useMemo(() =>
    Object.fromEntries(projects.map(p => [p._id, p])),
    [projects]
  )

  // ── Slides ────────────────────────────────────────────────────────────────
  const allSlides = useMemo(() => {
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
    return shuffle(slides)
  }, [projects])

  const filtered = useMemo(() =>
    cat === 'all' ? allSlides : allSlides.filter(s => s.category === cat),
    [cat, allSlides]
  )

  const repeated = useMemo(() => {
    if (filtered.length === 0) return []
    const ITEM_H_PX = (typeof window !== 'undefined' ? window.innerHeight : 900) * ITEM_H_VH / 100
    const total = filtered.reduce((sum, s) => sum + (s.aspectRatio ?? 1) * ITEM_H_PX + GAP, 0)
    if (!total) return []
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
    const minReps = Math.max(3, Math.ceil(vw / total) + 2)
    return Array.from({ length: minReps }, () => filtered).flat()
  }, [filtered])

  slidesRef.current     = filtered
  countRef.current      = filtered.length
  totalItemsRef.current = repeated.length

  // ── slot data (item widths / cumulative positions / totalW) ─────────────
  useEffect(() => {
    const calc = () => {
      const ITEM_H_PX = window.innerHeight * ITEM_H_VH / 100
      const { widths, positions, total } = computeSlotData(slidesRef.current, ITEM_H_PX)
      slotWidthsRef.current    = widths
      slotPositionsRef.current = positions
      totalW.current           = total
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [filtered]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll reset on category change ───────────────────────────────────────
  useEffect(() => {
    const n = filtered.length; if (n === 0) return
    const vw = window.innerWidth
    const ITEM_H_PX = window.innerHeight * ITEM_H_VH / 100
    const { widths, positions, total } = computeSlotData(slidesRef.current, ITEM_H_PX)
    slotWidthsRef.current    = widths
    slotPositionsRef.current = positions
    totalW.current           = total

    if (newScrollXRef.current !== null) {
      const x = newScrollXRef.current
      const viewCX = -x + vw / 2
      let bestIdx = 0, bestDist = Infinity
      for (let r = 0; r < n; r++) {
        const center = positions[r] + widths[r] / 2
        const diff = viewCX - center
        const q = Math.round(diff / total)
        const dist = Math.abs(diff - q * total)
        if (dist < bestDist) { bestDist = dist; bestIdx = r }
      }
      targetX.current = x; currentX.current = x; prevX.current = x
      activeAbsIdxRef.current = bestIdx; setActiveAbsIdx(bestIdx)
      newScrollXRef.current = null
      return
    }
    const x = vw / 2 - widths[0] / 2
    targetX.current = x; currentX.current = x; prevX.current = x
    activeAbsIdxRef.current = 0; setActiveAbsIdx(0)
  }, [cat, dataLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── totalH ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => { totalH.current = countRef.current * (window.innerHeight * V_ITEM_H_VH / 100 + vGapRef.current) }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [filtered.length])

  // ── V-mode scroll init when mounting with persisted V-mode ────────────────
  useEffect(() => {
    if (modeRef.current !== 'v' || !dataLoaded || filtered.length === 0) return
    const vh    = window.innerHeight
    const vItemH = vh * V_ITEM_H_VH / 100
    const slotH  = vItemH + V_GAP_PX
    const newY   = vh / 2 - vItemH / 2          // center first item
    targetYRef.current = newY; currentYRef.current = newY; prevYRef.current = newY
    totalH.current = filtered.length * slotH
  }, [dataLoaded, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const snapToNearest = () => {
    const N = countRef.current; if (!N) return
    const vw     = window.innerWidth
    const pos    = slotPositionsRef.current
    const widths = slotWidthsRef.current
    const cycleW = totalW.current
    if (!cycleW || !pos.length) return
    const viewCX = -currentX.current + vw / 2

    let bestR = 0, bestDist = Infinity
    for (let r = 0; r < N; r++) {
      const center = pos[r] + widths[r] / 2
      const diff   = viewCX - center
      const q      = Math.round(diff / cycleW)
      const dist   = Math.abs(diff - q * cycleW)
      if (dist < bestDist) { bestDist = dist; bestR = r }
    }
    const center = pos[bestR] + widths[bestR] / 2
    const diff   = viewCX - center
    const q      = Math.round(diff / cycleW)
    targetX.current = vw / 2 - center - q * cycleW
  }

  const snapToNearestV = () => {
    const n = countRef.current; if (!n) return
    const vh = window.innerHeight
    const itemH = vh * V_ITEM_H_VH / 100; const slotH = itemH + vGapRef.current
    const smPx  = vh * SM_TOTAL_VH
    const viewCY = -currentYRef.current + vh / 2
    const k = Math.round((viewCY - smPx - itemH / 2) / slotH)
    targetYRef.current = vh / 2 - smPx - itemH / 2 - k * slotH
  }

  // ── RAF loop (V-mode only — H-mode canvas has its own RAF) ───────────────
  useEffect(() => {
    let raf, snapped = false
    const tick = () => {
      const track = trackRef.current
      const n = countRef.current; const total = totalItemsRef.current
      const idle = Date.now() - lastScroll.current > SNAP_MS
      if (modeRef.current === 'v' && track) {
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
          const itemH  = window.innerHeight * V_ITEM_H_VH / 100; const slotH = itemH + vGapRef.current
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

  // ── Wheel (V-mode only — canvas handles H-mode) ───────────────────────────
  useEffect(() => {
    const slider = sliderRef.current; if (!slider) return
    const onWheel = (e) => {
      if (modeRef.current !== 'v') return
      e.preventDefault()
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.85
      targetYRef.current -= delta
      lastScroll.current = Date.now()
    }
    slider.addEventListener('wheel', onWheel, { passive: false })
    return () => slider.removeEventListener('wheel', onWheel)
  }, [])

  // ── Mouse drag (V-mode only — canvas handles H-mode drag) ────────────────
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let dragging = false, startY = 0, startTY = 0
    const onDown = (e) => {
      if (modeRef.current !== 'v') return
      e.preventDefault()
      dragging = true; startY = e.clientY; startTY = targetYRef.current
      lastScroll.current = Date.now()
    }
    const onMove = (e) => {
      if (!dragging || modeRef.current !== 'v') return
      targetYRef.current = startTY + (e.clientY - startY)
      lastScroll.current = Date.now()
    }
    const onUp = () => { dragging = false }
    track.addEventListener('mousedown', onDown, { passive: false })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { track.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── Touch (V-mode only — canvas handles H-mode touch) ────────────────────
  useEffect(() => {
    const track = trackRef.current; if (!track) return
    let startX = 0, startY = 0, startTY = 0, axis = null
    const onStart = (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY
      startTY = targetYRef.current; axis = null
    }
    const onMove = (e) => {
      if (modeRef.current !== 'v') return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (axis === null) axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (axis === 'v') { e.preventDefault(); targetYRef.current = startTY + dy; lastScroll.current = Date.now() }
    }
    track.addEventListener('touchstart', onStart, { passive: true })
    track.addEventListener('touchmove',  onMove,  { passive: false })
    return () => { track.removeEventListener('touchstart', onStart); track.removeEventListener('touchmove', onMove) }
  }, [])

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const handleModeToggle = useCallback(() => {
    if (transitioningRef.current) return
    transitioningRef.current = true

    const newMode   = modeRef.current === 'h' ? 'v' : 'h'
    const vw        = window.innerWidth
    const vh        = window.innerHeight
    const vItemH    = vh * V_ITEM_H_VH / 100
    const slotH     = vItemH + vGapRef.current
    const activeIdx = activeAbsIdxRef.current

    // ── Capture positions BEFORE mode changes (FLIP "from" positions) ─────
    const rects = wrapperRefsArr.current
      .map(el => {
        if (!el) return null
        const r = el.getBoundingClientRect()
        if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > vh) return null
        return { el, centerX: r.left + r.width / 2, centerY: r.top + r.height / 2 }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const da = Math.abs(a.centerX - vw / 2) + Math.abs(a.centerY - vh / 2)
        const db = Math.abs(b.centerX - vw / 2) + Math.abs(b.centerY - vh / 2)
        return da - db
      })

    if (newMode === 'v') {
      // Position V-mode track to center active item
      const smVPx = vh * SM_TOTAL_VH
      const newY  = vh / 2 - smVPx - vItemH / 2 - activeIdx * slotH
      targetYRef.current = newY; currentYRef.current = newY; prevYRef.current = newY
      totalH.current = countRef.current * slotH
      // Instantly hide canvas — FLIP is the sole animation
      gsap.killTweensOf(hSliderRef.current)
      gsap.set(hSliderRef.current, { opacity: 0 })
    } else {
      // Position H-mode track to center active item
      const n       = slidesRef.current.length
      const activeI = activeIdx % Math.max(n, 1)
      const ITEM_H_PX = vh * ITEM_H_VH / 100
      const { widths, positions } = computeSlotData(slidesRef.current, ITEM_H_PX)
      const activeCX = positions[activeI] + widths[activeI] / 2
      const newX = vw / 2 - activeCX
      currentX.current = newX; targetX.current = newX; prevX.current = newX
      gsap.killTweensOf(hSliderRef.current)
      // Canvas reveal handled by FLIP useLayoutEffect after spring completes
    }

    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })
    if (lineRef.current) {
      gsap.to(lineRef.current, { rotate: newMode === 'v' ? 90 : 0, duration: FLIP_TOTAL_DUR * 0.75, ease: 'power2.inOut' })
    }

    // Suppress GalleryItem CSS transitions for the FLIP duration
    if (sliderRef.current) sliderRef.current.classList.add('mode-transitioning')

    modeRef.current = newMode
    _persistedMode  = newMode
    setMode(newMode)
    setFlipRects(rects)
  }, [showLabel]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Click → expand in place (desktop) / navigate (mobile) ───────────────
  const handleItemClick = useCallback((slide) => {
    if (transitioningRef.current) return
    transitioningRef.current = true
    const projectId = slide.projectId
    const state     = { project: projectsMap[projectId] ?? null }
    if (window.innerWidth < 768) {
      navigate(`/work/${projectId}`, { state })
      return
    }
    gsap.to(wrapRef.current, {
      y: -window.innerHeight,
      duration: 0.6,
      ease: 'power3.in',
      onComplete: () => navigate(`/work/${projectId}`, { state }),
    })
  }, [navigate, projectsMap])

  // ── List hover → scroll ───────────────────────────────────────────────────
  const handleListHover = useCallback((i) => {
    if (modeRef.current !== 'v') return
    const vh       = window.innerHeight
    const vItemH   = vh * V_ITEM_H_VH / 100
    const hoverGap = vh * V_GAP_HOVER_VH / 100
    vGapRef.current = hoverGap
    const newTotal  = countRef.current * (vItemH + hoverGap)
    totalH.current  = newTotal
    const slotH    = vItemH + hoverGap
    const smPx     = vh * SM_TOTAL_VH
    const baseY    = vh / 2 - smPx - vItemH / 2 - i * slotH
    if (newTotal > 0) {
      const copies = Math.round((currentYRef.current - baseY) / newTotal)
      targetYRef.current = baseY + copies * newTotal
    } else {
      targetYRef.current = baseY
    }
    lastScroll.current = Date.now()
  }, [])

  const handleListLeave = useCallback(() => {
    setHoveredListIdx(null)
    if (modeRef.current !== 'v') return
    const vh     = window.innerHeight
    const vItemH = vh * V_ITEM_H_VH / 100
    vGapRef.current = V_GAP_PX
    const newTotal = countRef.current * (vItemH + V_GAP_PX)
    totalH.current = newTotal
    const smPx   = vh * SM_TOTAL_VH
    const absIdx = activeAbsIdxRef.current
    const slotH  = vItemH + V_GAP_PX
    const baseY  = vh / 2 - smPx - vItemH / 2 - absIdx * slotH
    if (newTotal > 0) {
      const copies = Math.round((currentYRef.current - baseY) / newTotal)
      targetYRef.current = baseY + copies * newTotal
    } else {
      targetYRef.current = baseY
    }
  }, [])

  // ── Init decorative lines + canvas visibility ────────────────────────────
  useLayoutEffect(() => {
    if (lineRef.current) gsap.set(lineRef.current, {
      xPercent: -50, yPercent: -50,
      rotate: modeRef.current === 'v' ? 90 : 0,
      height: Math.max(window.innerWidth, window.innerHeight),
    })
    // Canvas opacity is GSAP-controlled (not React CSS) so toggling is instant
    if (hSliderRef.current) gsap.set(hSliderRef.current, { opacity: modeRef.current === 'h' ? 1 : 0 })
    // Track starts in correct position for initial mode
    if (trackRef.current) {
      if (modeRef.current === 'h') gsap.set(trackRef.current, { x: Math.round(currentX.current), y: 0 })
      else                         gsap.set(trackRef.current, { x: 0, y: Math.round(currentYRef.current) })
    }
  }, [])

  // ── Intro: hide filmstrip before first paint ──────────────────────────────
  useLayoutEffect(() => {
    if (!skipIntro && wrapRef.current) gsap.set(wrapRef.current, { opacity: 0 })
  }, [skipIntro])

  // ── Intro: curtain + cascade ──────────────────────────────────────────────
  useEffect(() => {
    if (!introComplete) return
    const cascade = () => {
      if (!wrapRef.current) return
      gsap.set(wrapRef.current, { opacity: 1 })
      if (modeRef.current === 'h' && hSliderRef.current) {
        gsap.fromTo(hSliderRef.current, { x: 200, opacity: 0 }, { x: 0, opacity: 1, duration: 1.85, ease: 'expo.out' })
      }
    }
    if (skipIntro) { cascade(); return }
    _introPlayed = true
    labelReadyRef.current = false
    if (labelRef.current) gsap.set(labelRef.current, { opacity: 0 })
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.7, ease: 'power2.out',
      onComplete: () => {
        setOverlayGone(true)
        if (!wrapRef.current) return
        gsap.set(wrapRef.current, { opacity: 1 })
        if (modeRef.current === 'h' && hSliderRef.current) {
          gsap.fromTo(hSliderRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' })
        }
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
        const ITEM_H_PX = window.innerHeight * ITEM_H_VH / 100
        const { widths, positions } = computeSlotData(targetArr, ITEM_H_PX)
        const anchorCX = anchor.rect.left + anchor.rect.width / 2
        newScrollXRef.current = anchorCX - (positions[anchorIdx] + widths[anchorIdx] / 2)
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

  // ── FLIP: spring items from old screen position to new ───────────────────
  // Classic FLIP: flipRects holds positions captured BEFORE mode change.
  // After React re-renders (items now at new layout positions), we read the
  // new positions, compute the delta, set items to the delta offset, then
  // spring them back to 0 — users see them gliding from old to new.
  useLayoutEffect(() => {
    if (!flipRects || !flipRects.length) return

    const track = trackRef.current
    if (track) {
      if (modeRef.current === 'v') gsap.set(track, { x: 0, y: Math.round(currentYRef.current) })
      else                         gsap.set(track, { x: Math.round(currentX.current), y: 0 })
    }

    // During the spring: DOM items are visible, canvas is hidden
    if (sliderRef.current)  gsap.set(sliderRef.current,  { opacity: 1 })
    if (hSliderRef.current) gsap.set(hSliderRef.current, { opacity: 0 })

    const isNowV        = modeRef.current === 'v'
    const scaleFrom     = isNowV ? ITEM_W / V_ITEM_W : V_ITEM_W / ITEM_W

    flipRects.forEach(({ el, centerX, centerY }, rank) => {
      if (!el) return

      gsap.set(el, { clearProps: 'transform' })
      const r  = el.getBoundingClientRect()
      const dx = centerX - (r.left + r.width  / 2)
      const dy = centerY - (r.top  + r.height / 2)
      const delay = rank * 0.025

      // Size morph: appear as the old mode's size, animate to new mode's size
      const child = el.firstChild
      if (child) {
        gsap.fromTo(child,
          { scale: scaleFrom, transformOrigin: 'center center' },
          { scale: 1, duration: 0.75, ease: 'power2.inOut', delay }
        )
      }

      if (Math.abs(dx) >= 2 || Math.abs(dy) >= 2) {
        animate(el, { x: [dx, 0], y: [dy, 0] }, {
          type: 'spring', stiffness: 280, damping: 30, mass: 0.65,
          delay,
          onComplete: () => gsap.set(el, { clearProps: 'transform' }),
        })
      }
    })

    gsap.delayedCall(FLIP_TOTAL_DUR, () => {
      if (sliderRef.current) sliderRef.current.classList.remove('mode-transitioning')
      // Restore correct visibility: H-mode → canvas shows, DOM hides; V-mode → DOM stays visible
      if (modeRef.current === 'h') {
        if (sliderRef.current)  gsap.set(sliderRef.current,  { opacity: 0 })
        if (hSliderRef.current) gsap.set(hSliderRef.current, { opacity: 1 })
      }
      transitioningRef.current = false
      const n   = slidesRef.current.length
      const idx = activeAbsIdxRef.current % Math.max(n, 1)
      showLabel(idx)
    })

    setFlipRects(null)
  }, [flipRects, showLabel]) // eslint-disable-line react-hooks/exhaustive-deps

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


      {!isMobile && (
        // Single 1px line centred at 50vw/50vh, long enough to span the viewport
        // in any rotation. GSAP rotates it between 0deg (vertical, H mode) and
        // 90deg (horizontal, V mode) — one smooth motion through the centre.
        <div ref={lineRef} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '1px',
          background: 'rgba(240,236,230,0.07)',
          zIndex: 2, pointerEvents: 'none',
        }} />
      )}

      {/* Unified DOM track — same elements in H (row) and V (column) mode.
          H-mode: hidden (opacity 0, no transition) so only canvas shows.
          FLIP useLayoutEffect forces opacity 1 during the spring. */}
      <div ref={sliderRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex',
        alignItems:     mode === 'v' ? 'flex-start' : 'center',
        justifyContent: mode === 'v' ? 'center'     : 'flex-start',
        paddingRight:   mode === 'v' && !isMobile ? `${V_LIST_W_VW}vw` : '0',
        cursor: 'default', userSelect: 'none', zIndex: 5,
        touchAction: mode === 'v' ? 'pan-y' : 'none',
        pointerEvents: mode === 'v' ? 'auto' : 'none',
        opacity: mode === 'h' ? 0 : 1,
      }}>
        <div ref={trackRef} style={{
          display: 'flex',
          flexDirection: mode === 'v' ? 'column' : 'row',
          gap: mode === 'v'
            ? (hoveredListIdx !== null ? `${V_GAP_HOVER_VH}vh` : `${V_GAP_PX}px`)
            : `${GAP}px`,
          willChange: 'transform',
        }}>
          {repeated.map((slide, i) => (
            <div
              key={`wrap-${slide._id}-${i}`}
              ref={el => { wrapperRefsArr.current[i] = el }}
              style={{ flexShrink: 0 }}
              onClick={() => handleItemClick(slide)}
            >
              <GalleryItem
                slide={slide}
                isActive={i === activeAbsIdx}
                mode={mode}
                listHovered={mode === 'v' && hoveredListIdx !== null}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Canvas overlay — sits above DOM track; GSAP controls opacity (no React CSS) */}
      <div ref={hSliderRef} style={{
        position: 'absolute', inset: 0, zIndex: 6,
        pointerEvents: mode === 'h' ? 'auto' : 'none',
      }}>
        {filtered.length > 0 && (
          <HeroCanvas
            slides={filtered}
            onActiveChange={(idx) => {
              activeAbsIdxRef.current = idx; setActiveAbsIdx(idx)
              // Keep DOM track X position in sync with canvas so FLIP has accurate "from" positions
              if (modeRef.current === 'h' && trackRef.current) {
                const n = slidesRef.current.length; if (!n) return
                const ITEM_H_PX = window.innerHeight * ITEM_H_VH / 100
                const { widths, positions } = computeSlotData(slidesRef.current, ITEM_H_PX)
                const activeI  = idx % n
                const activeCX = positions[activeI] + widths[activeI] / 2
                const x = window.innerWidth / 2 - activeCX
                currentX.current = x; targetX.current = x
                gsap.set(trackRef.current, { x: Math.round(x), y: 0 })
              }
            }}
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
            fontFamily: '"Noto Sans Mono", monospace',
            fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
            fontWeight: mode === 'h' ? 700 : 300,
            color: mode === 'h' ? '#f0ece6' : 'rgba(240,236,230,0.28)',
            transition: 'color 0.4s ease',
            userSelect: 'none',
          }}
        >
          SLIDER
        </button>
        <button
          onClick={() => mode !== 'v' && handleModeToggle()}
          style={{
            position: 'absolute', bottom: '48px', left: 'calc(50% + 14px)', zIndex: 20,
            background: 'none', border: 'none', padding: '6px 0',
            cursor: mode === 'v' ? 'default' : 'pointer',
            fontFamily: '"Noto Sans Mono", monospace',
            fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase',
            fontWeight: mode === 'v' ? 700 : 300,
            color: mode === 'v' ? '#f0ece6' : 'rgba(240,236,230,0.28)',
            transition: 'color 0.4s ease',
            userSelect: 'none',
          }}
        >
          LIST
        </button>
      </>)}


      {/* ── H-mode title / year label ────────────────────────────────────── */}
      {mode === 'h' && (
        <div style={{
          position: 'absolute', zIndex: 20, pointerEvents: 'none',
          top: LABEL_Y, left: 0, right: 0,
        }}>
          <div ref={labelRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0 }}>
            <div style={{ overflow: 'hidden' }}>
              <p ref={labelTitleRef} style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: isMobile ? '0.95rem' : 'clamp(0.85rem, 1.5vw, 1.2rem)', fontStyle: 'italic', fontWeight: 300, letterSpacing: '0.02em', color: '#f0ece6', lineHeight: 1.2, marginBottom: 12, paddingRight: '0.25em' }} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p ref={labelYearRef} style={{ fontFamily: '"Noto Sans Mono", monospace', fontSize: '8px', letterSpacing: '0.45em', color: '#2e2e2e' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── V-mode line mask — black box covers right panel area, hides line bleed ── */}
      {!isMobile && mode === 'v' && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0,
          width: `${V_LIST_W_VW}vw`,
          background: '#000',
          zIndex: 3,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── V-mode work list ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!isMobile && mode === 'v' && (
          <motion.div
            key="v-list"
            className="no-scrollbar"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36, transition: { duration: 0.2, ease: 'easeIn' } }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
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
              const isHov = hoveredListIdx === i
              return (
                <motion.div
                  key={slide._id}
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.5,
                    delay:    0.06 + i * 0.038,
                    ease:     [0.16, 1, 0.3, 1],
                  }}
                  onMouseEnter={() => { setHoveredListIdx(i); handleListHover(i) }}
                  onMouseLeave={handleListLeave}
                  onClick={() => navigate(`/work/${slide.projectId}`)}
                  style={{
                    position:     'relative',
                    overflow:     'hidden',
                    display:      'flex',
                    alignItems:   'baseline',
                    gap:          '14px',
                    padding:      '8px 10px',
                    cursor:       'pointer',
                    userSelect:   'none',
                    borderBottom: '1px solid rgba(240,236,230,0.05)',
                  }}
                >
                  {/* Swipe fill — scales from left on hover */}
                  <motion.div
                    animate={{ scaleX: isHov ? 1 : 0 }}
                    initial={false}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                      position:        'absolute',
                      inset:           0,
                      background:      '#f0ece6',
                      transformOrigin: 'left',
                      pointerEvents:   'none',
                      zIndex:          0,
                    }}
                  />

                  {/* Left: index + category */}
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'baseline', minWidth: '72px' }}>
                    <span style={{
                      fontFamily:    '"Noto Sans Mono", monospace',
                      fontSize:      '9px',
                      letterSpacing: '0.12em',
                      color:         isHov ? '#000' : '#444',
                      transition:    'color 0.22s ease',
                      width:         '18px',
                      flexShrink:    0,
                    }}>
                      {String(i).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontFamily:    '"Noto Sans Mono", monospace',
                      fontSize:      '8px',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color:         isHov ? '#222' : '#333',
                      transition:    'color 0.22s ease',
                    }}>
                      {slide.category ? `.${slide.category.replace('.', '').toUpperCase()}` : ''}
                    </span>
                  </div>

                  {/* Title */}
                  <span style={{
                    position:     'relative',
                    zIndex:       1,
                    flex:         1,
                    fontFamily:   '"Noto Sans Mono", monospace',
                    fontSize:     'clamp(0.68rem, 1.1vw, 0.88rem)',
                    fontStyle:    'italic',
                    fontWeight:   300,
                    color:        isHov ? '#000' : '#f0ece6',
                    transition:   'color 0.22s ease',
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight:   1.3,
                  }}>
                    {slide.title}
                  </span>

                  {/* Year */}
                  {slide.year && (
                    <span style={{
                      position:      'relative',
                      zIndex:        1,
                      fontFamily:    '"Noto Sans Mono", monospace',
                      fontSize:      '9px',
                      letterSpacing: '0.1em',
                      color:         isHov ? '#333' : '#444',
                      transition:    'color 0.22s ease',
                      flexShrink:    0,
                    }}>
                      {slide.year}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
