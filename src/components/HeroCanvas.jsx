// Single Three.js canvas for both slider (H) and list (V) modes.
// Meshes animate between horizontal and vertical layouts on mode change —
// no DOM overlay, no fake transition, just real mesh position animation.
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { imageCdnBase } from '../sanityImage'

const SLIDE_H      = 1.2
const GAP_H        = 0.09
const GAP_V        = 0.26
const SMOOTHING    = 0.09
const DISTORT_STR  = 2.3
const DISTORT_LERP = 0.12
const MOM_FRICTION = 0.93
const WHEEL_MAX    = 200
const WHEEL_SPEED  = 0.004
const DRAG_SPEED   = 0.008
const DRAG_MOM     = 0.022
// Touch feel (phones/tablets): follow the finger more eagerly, glide much
// further after release, and let the center-snap pull gently instead of
// yanking — mouse users keep the tighter desktop tuning above.
const TOUCH_SPEED     = 0.008   // finger px → scroll (drag follow)
const TOUCH_MOM       = 0.018   // release velocity → momentum
const FRICTION_TOUCH  = 0.94    // per-frame momentum decay (higher = longer glide)
const SNAP_PULL_TOUCH = 0.07    // fraction of remaining snap distance per frame
const BLEND_DUR    = 1.1   // seconds for H↔V layout transition

// Matches useIsMobile's 1100 breakpoint so "mobile" means the same thing
// in the canvas as it does in the rest of the app.
const isMob = () => window.innerWidth < 1100

function imgUrl(ref) {
  const w = window.innerWidth < 768 ? 600 : window.innerWidth < 1100 ? 800 : 1200
  return `${imageCdnBase(ref)}?w=${w}&q=80&fm=webp&fit=clip`
}

const HeroCanvas = forwardRef(function HeroCanvas({ slides, mode, onActiveChange, onSlideClick }, ref) {
  const canvasRef    = useRef(null)
  const cbsRef       = useRef({ onActiveChange, onSlideClick, slides })
  const burstRef     = useRef(null)
  // blend.v: 0 = full H-mode, 1 = full V-mode. GSAP animates this on mode change.
  const blendObj     = useRef({ v: mode === 'v' ? 1 : 0 })
  // per-mesh blend values — staggered so center transitions first
  const meshBlendsRef = useRef([])

  // Scroll state shared between the main RAF effect and the mode-change effect
  const hScroll      = useRef({ pos: 0, target: 0, snap: null, momentum: 0 })
  const vScroll      = useRef({ pos: 0, target: 0, snap: null, momentum: 0 })
  const isScrolling  = useRef(false)
  const activeIdxRef = useRef(0)
  const layoutRef      = useRef(null)   // set after first slides init
  const scrollTimerRef = useRef(null)

  useEffect(() => { cbsRef.current = { onActiveChange, onSlideClick, slides } })

  useImperativeHandle(ref, () => ({
    centerSlide(idx) {
      const lay = layoutRef.current; if (!lay) return
      if (blendObj.current.v >= 0.5) {
        vScroll.current.target = lay.vOffsets[idx] ?? 0
        vScroll.current.snap = null
      } else {
        hScroll.current.target = lay.hOffsets[idx] ?? 0
        hScroll.current.snap = null
      }
      isScrolling.current = true
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => { isScrolling.current = false }, 700)
    },
  }))

  // ── Mode-change: sync opposite scroll + animate blend ────────────────────
  useEffect(() => {
    const lay = layoutRef.current
    if (!lay) return
    const ai = activeIdxRef.current
    if (mode === 'v') {
      // entering V: jump V scroll so active image is at center (y=0)
      vScroll.current.pos = vScroll.current.target = lay.vOffsets[ai] ?? 0
      vScroll.current.snap = null
    } else {
      // entering H: jump H scroll so active image is at center (x=0)
      hScroll.current.pos = hScroll.current.target = lay.hOffsets[ai] ?? 0
      hScroll.current.snap = null
    }
    gsap.killTweensOf(blendObj.current)

    // Global blend — smooth, drives camera position + inTrans lock
    gsap.to(blendObj.current, {
      v: mode === 'v' ? 1 : 0,
      duration: BLEND_DUR,
      ease: 'power2.inOut',
    })

    // Per-mesh staggered blend — center image first, outer images delayed
    const target = mode === 'v' ? 1 : 0
    const n      = meshBlendsRef.current.length
    meshBlendsRef.current.forEach((blend, i) => {
      const dist  = Math.min(Math.abs(i - ai), n - Math.abs(i - ai))
      const delay = dist * 0.08
      gsap.killTweensOf(blend)
      gsap.to(blend, { v: target, duration: BLEND_DUR, delay, ease: 'power2.inOut' })
    })
  }, [mode])

  // ── Main Three.js effect ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !slides.length) return

    // Set by anything that changes the scene outside the per-frame math
    // (resize, texture arrival, final flatten) so the settled-scene render
    // skip below never swallows a real update.
    let needsRender = true

    // renderer / camera
    // MSAA is redundant once the buffer is supersampled at DPR ≥ 2 — skipping
    // it saves real GPU time on exactly the devices that have the least.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.z = 5
    const resize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      needsRender = true
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // ── H layout (horizontal filmstrip) ───────────────────────────────────
    const n = slides.length
    const slideWidths = slides.map(s => SLIDE_H * (s.aspectRatio ?? 1))
    const hOffsets = []
    let stkH = 0
    for (let i = 0; i < n; i++) {
      const w = slideWidths[i]
      if (i === 0) { hOffsets.push(0); stkH = w / 2 }
      else { stkH += GAP_H + w / 2; hOffsets.push(stkH); stkH += w / 2 }
    }
    const hLoopLen = stkH + GAP_H + slideWidths[0] / 2
    const hHalf    = hLoopLen / 2

    // ── V layout (vertical stack, uniform height) ─────────────────────────
    // vOffsets[i] = vertical scroll position at which slide i is at y=0 (center)
    // Images are arranged: 0 at center when vs.pos=0, 1 below, 2 further below.
    const vOffsets = []
    let stkV = 0
    for (let i = 0; i < n; i++) {
      if (i === 0) { vOffsets.push(0); stkV = SLIDE_H / 2 }
      else { stkV += GAP_V + SLIDE_H / 2; vOffsets.push(stkV); stkV += SLIDE_H / 2 }
    }
    const vLoopLen = stkV + GAP_V + SLIDE_H / 2
    const vHalf    = vLoopLen / 2

    layoutRef.current = { hOffsets, vOffsets, hLoopLen, hHalf, vLoopLen, vHalf }

    // ── Meshes ────────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader()
    const meshes = [], timers = []
    // The distortion wave reads fine at half density on small screens, and
    // the per-vertex loop in distort() is the hottest CPU path while swiping.
    const [segX, segY] = isMob() ? [20, 10] : [32, 16]
    for (let i = 0; i < n; i++) {
      const geo = new THREE.PlaneGeometry(slideWidths[i], SLIDE_H, segX, segY)
      const mat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, color: 0x1a1a1a, transparent: true, opacity: 0.28,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.userData = { origVerts: [...geo.attributes.position.array], index: i }
      scene.add(mesh); meshes.push(mesh)
    }

    // Init per-mesh blends to match current global blend
    meshBlendsRef.current = Array.from({ length: n }, () => ({ v: blendObj.current.v }))

    // `disposed` guards async texture callbacks that resolve after cleanup —
    // without it a late load re-attaches a texture to a disposed material
    // and that GPU texture is never freed.
    let disposed = false
    const loadOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a) - Math.abs(b))
    loadOrder.forEach((i, rank) => {
      if (!slides[i]?.imageRef) return
      const t = setTimeout(() => {
        loader.load(imgUrl(slides[i].imageRef), tex => {
          if (disposed) { tex.dispose(); return }
          tex.colorSpace = THREE.SRGBColorSpace
          meshes[i].material.map = tex
          meshes[i].material.color.set(0xffffff)
          meshes[i].material.needsUpdate = true
          needsRender = true
        })
      }, rank === 0 ? 0 : rank * (isMob() ? 120 : 40))
      timers.push(t)
    })

    // ── Distortion ────────────────────────────────────────────────────────
    // Blends between horizontal wave (H-mode) and vertical wave (V-mode)
    // No computeVertexNormals here: MeshBasicMaterial is unlit and never
    // reads normals, so recomputing them each frame was pure CPU waste.
    function distort(mesh, hX, vY, bv, strength) {
      // Early-out: once the wave has fully decayed, flatten the plane a
      // single time and skip the per-vertex loop until strength returns.
      if (Math.abs(strength) < 0.001) {
        if (!mesh.userData.flat) {
          const pos = mesh.geometry.attributes.position
          for (let vi = 0; vi < pos.count; vi++) pos.setZ(vi, 0)
          pos.needsUpdate = true
          mesh.userData.flat = true
          needsRender = true
        }
        return
      }
      mesh.userData.flat = false
      const pos  = mesh.geometry.attributes.position
      const orig = mesh.userData.origVerts
      for (let vi = 0; vi < pos.count; vi++) {
        const lx = orig[vi * 3], ly = orig[vi * 3 + 1]
        const hd = Math.sqrt((hX + lx) ** 2 + ly * ly)
        const hb = Math.pow(Math.sin((Math.max(0, 1 - hd / 4) * Math.PI) / 2), 1.5)
        const vd = Math.sqrt(lx * lx + (vY + ly) ** 2)
        const vb = Math.pow(Math.sin((Math.max(0, 1 - vd / 4) * Math.PI) / 2), 1.5)
        pos.setZ(vi, (hb * (1 - bv) + vb * bv) * strength)
      }
      pos.needsUpdate = true
    }

    // ── Local state (RAF closure) ──────────────────────────────────────────
    let distAmt = 0, distTarget = 0, velPeak = 0
    const velHist = [0, 0, 0, 0, 0]
    let lastTime = 0
    let isDragging = false, dragPrev = { x: 0, y: 0 }, totalDragDelta = 0
    const dragVelWin = [0, 0, 0, 0, 0]
    let touchPrev = { x: 0, y: 0 }, touchOrigin = { x: 0, y: 0 }
    const touchVelWin = [0, 0, 0, 0, 0]
    let curActiveIdx = -1

    const wrap = (v, r) => ((v % r) + r) % r
    const isH  = () => blendObj.current.v < 0.5
    const inTrans = () => blendObj.current.v > 0.02 && blendObj.current.v < 0.98

    // Touch devices get the floatier physics regardless of viewport width
    const coarse   = navigator.maxTouchPoints > 0
    const friction = coarse ? FRICTION_TOUCH : MOM_FRICTION
    const snapPull = coarse ? SNAP_PULL_TOUCH : 1

    const burstDistort = a => { distTarget = Math.min(1, Math.abs(distTarget) + a) }
    burstRef.current = burstDistort

    // ── Input ─────────────────────────────────────────────────────────────
    const onWheel = e => {
      e.preventDefault()
      // V (list) mode: scrolling locked — hover on the list drives the canvas
      if (inTrans() || !isH()) return
      const raw   = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), WHEEL_MAX)
      hScroll.current.snap = null
      hScroll.current.target -= delta * WHEEL_SPEED
      isScrolling.current = true
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => { isScrolling.current = false }, 400)
    }

    const onTouchStart = e => {
      if (inTrans() || !isH()) return
      touchOrigin.x = touchPrev.x = e.touches[0].clientX
      touchOrigin.y = touchPrev.y = e.touches[0].clientY
      touchVelWin.fill(0)
      isScrolling.current = true
      hScroll.current.momentum = 0; vScroll.current.momentum = 0
    }
    const onTouchMove = e => {
      e.preventDefault(); if (inTrans() || !isH()) return
      const dx = e.touches[0].clientX - touchPrev.x
      touchPrev.x = e.touches[0].clientX; touchPrev.y = e.touches[0].clientY
      hScroll.current.snap = null; hScroll.current.target += dx * TOUCH_SPEED
      touchVelWin.push(dx); touchVelWin.shift()
    }
    const onTouchEnd = () => {
      if (!isH()) return
      // Momentum from the last few move deltas (same as mouse drag), not the
      // total swipe displacement — a swipe-then-hold now stops dead instead
      // of flinging, and a fast flick carries its real release velocity.
      const avgVel = touchVelWin.reduce((a, b) => a + b) / touchVelWin.length
      if (Math.abs(avgVel) > 0.35) { hScroll.current.momentum = avgVel * TOUCH_MOM; isScrolling.current = true; setTimeout(() => { isScrolling.current = false }, 1300) }
      else setTimeout(() => { isScrolling.current = false }, 500)
    }

    const onMouseDown = e => {
      if (e.button !== 0 || inTrans() || !isH()) return
      isDragging = true; dragPrev.x = e.clientX; dragPrev.y = e.clientY
      totalDragDelta = 0; dragVelWin.fill(0)
      hScroll.current.momentum = 0; vScroll.current.momentum = 0
      canvas.style.cursor = 'grabbing'
    }
    const onMouseMove = e => {
      if (!isDragging) return
      const dx = e.clientX - dragPrev.x, dy = e.clientY - dragPrev.y
      dragPrev.x = e.clientX; dragPrev.y = e.clientY
      if (isH()) {
        hScroll.current.snap = null; hScroll.current.target += dx * DRAG_SPEED
        dragVelWin.push(dx); dragVelWin.shift()
        totalDragDelta += Math.abs(dx)
      } else {
        vScroll.current.snap = null; vScroll.current.target += dy * DRAG_SPEED
        dragVelWin.push(-dy); dragVelWin.shift()
        totalDragDelta += Math.abs(dy)
      }
      isScrolling.current = true
    }
    const onMouseUp = () => {
      if (!isDragging) return
      isDragging = false; canvas.style.cursor = 'grab'
      const avgVel = dragVelWin.reduce((a, b) => a + b) / dragVelWin.length
      if (Math.abs(avgVel) > 0.5) {
        if (isH()) hScroll.current.momentum = avgVel * DRAG_MOM
        else        vScroll.current.momentum = avgVel * DRAG_MOM
        isScrolling.current = true; setTimeout(() => { isScrolling.current = false }, 800)
      }
    }
    const onClick = e => {
      if (totalDragDelta > 8) return
      const rect = canvas.getBoundingClientRect()
      const ray  = new THREE.Raycaster()
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width)  * 2 - 1,
          -((e.clientY - rect.top)  / rect.height) * 2 + 1,
        ),
        camera,
      )
      const hit = ray.intersectObjects(meshes)[0]
      if (hit) cbsRef.current.onSlideClick?.(cbsRef.current.slides[hit.object.userData.index])
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('wheel',      onWheel,      { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd)
    canvas.addEventListener('mousedown',  onMouseDown)
    window.addEventListener('mousemove',  onMouseMove)
    window.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('click',      onClick)
    window.addEventListener('resize',     resize)

    // ── Tick ──────────────────────────────────────────────────────────────
    let rafId
    function tick(time) {
      rafId = requestAnimationFrame(tick)
      const dt  = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime  = time
      const bv  = blendObj.current.v
      const hs  = hScroll.current
      const vs  = vScroll.current

      // Apply momentum & LERP scroll
      if (isScrolling.current) {
        hs.target += hs.momentum; hs.momentum *= friction; if (Math.abs(hs.momentum) < 0.001) hs.momentum = 0
        vs.target += vs.momentum; vs.momentum *= friction; if (Math.abs(vs.momentum) < 0.001) vs.momentum = 0
      }
      const prevH = hs.pos; hs.pos += (hs.target - hs.pos) * SMOOTHING
      const prevV = vs.pos; vs.pos += (vs.target - vs.pos) * SMOOTHING

      // Velocity / distortion envelope
      const fd  = bv < 0.5 ? hs.pos - prevH : -(vs.pos - prevV)
      const vel = Math.abs(fd) / (dt || 0.016)
      velHist.push(vel); velHist.shift()
      const avgV  = velHist.reduce((a, b) => a + b) / 5
      if (avgV > velPeak) velPeak = avgV
      const decel = avgV / (velPeak + 0.001) < 0.7 && velPeak > 0.5
      velPeak *= 0.99
      if (vel > 0.05) {
        const sign = fd >= 0 ? 1 : -1
        const mag  = Math.min(1, vel * 0.1)
        // Same direction → keep the stronger magnitude; opposite → switch immediately
        if (sign > 0) distTarget = Math.max(distTarget, mag)
        else          distTarget = Math.min(distTarget, -mag)
      }
      if (decel || avgV < 0.2) distTarget *= decel ? 0.95 : 0.855
      distAmt += (distTarget - distAmt) * DISTORT_LERP
      const sD = distAmt   // signed: positive = outward, negative = inward

      // Position meshes — blend between H and V layouts
      // In V mode shift camera right so images appear in the left 58vw (not under the list panel)
      camera.position.x = bv * 0.42 * Math.tan(Math.PI / 8) * 5 * camera.aspect

      let closestDist = Infinity, closestIdx = 0, closestHX = 0, closestVY = 0
      meshes.forEach(mesh => {
        const i = mesh.userData.index

        // H position (wrapping horizontal)
        let hX = -(hOffsets[i] - wrap(hs.pos, hLoopLen))
        hX = wrap(hX + hHalf, hLoopLen) - hHalf

        // V position: negative Y = below center in Three.js (screen down)
        // vs.pos = vOffsets[i] → vY = 0 (image at screen center)
        let vY = -(vOffsets[i] - wrap(vs.pos, vLoopLen))
        vY = wrap(vY + vHalf, vLoopLen) - vHalf

        // Per-mesh blend: center image transitions first, outer images follow
        const mbv = meshBlendsRef.current[i]?.v ?? bv

        // Blend: images travel from H positions to V positions
        mesh.position.x =  hX * (1 - mbv)
        mesh.position.y = -vY * mbv   // negate: positive vY means above-center, Three.js +Y is up

        // Scale down in V mode so list-view images feel tighter
        const s = 1 - mbv * 0.18
        mesh.scale.set(s, s, 1)

        // Closest to screen center (use global bv for mode determination)
        const dist = bv < 0.5 ? Math.abs(hX) : Math.abs(vY)
        if (dist < closestDist) { closestDist = dist; closestIdx = i; closestHX = hX; closestVY = vY }

        distort(mesh, hX, vY, mbv, sD * DISTORT_STR)
      })

      // Snap to center when idle
      if (!isDragging && !isScrolling.current && !inTrans()) {
        // Desktop: target jumps straight onto the snap point (firm magnet).
        // Touch: target only eases a fraction of the way each frame — the
        // slide settles into center instead of being grabbed.
        if (bv < 0.5) {
          if (hs.snap === null && Math.abs(closestHX) > 0.005) hs.snap = hs.pos - closestHX
          if (hs.snap !== null) {
            hs.target += (hs.snap - hs.target) * snapPull
            if (Math.abs(hs.pos - hs.snap) < 0.002) { hs.pos = hs.target = hs.snap; hs.snap = null }
          }
        } else {
          if (vs.snap === null && Math.abs(closestVY) > 0.005) vs.snap = vs.pos - closestVY
          if (vs.snap !== null) {
            vs.target += (vs.snap - vs.target) * snapPull
            if (Math.abs(vs.pos - vs.snap) < 0.002) { vs.pos = vs.target = vs.snap; vs.snap = null }
          }
        }
      }

      // Dim inactive
      let maxOpacityDelta = 0
      meshes.forEach(mesh => {
        const t = mesh.userData.index === closestIdx ? 1.0 : 0.28
        const d = (t - mesh.material.opacity) * 0.12
        mesh.material.opacity += d
        if (Math.abs(d) > maxOpacityDelta) maxOpacityDelta = Math.abs(d)
      })

      if (closestIdx !== curActiveIdx) {
        curActiveIdx = closestIdx
        activeIdxRef.current = closestIdx
        cbsRef.current.onActiveChange?.(closestIdx)
      }

      // Demand rendering: when every animated quantity has converged the
      // frame is pixel-identical to the last one — skip the GPU work. The
      // RAF loop stays alive so input picks up instantly. Per-mesh blends
      // are checked separately from inTrans() because their staggered
      // delays outlive the global blend tween.
      let blendsSettled = true
      for (const b of meshBlendsRef.current) {
        if (Math.abs(b.v - bv) > 0.001) { blendsSettled = false; break }
      }
      const settled =
        !needsRender && !isDragging && !isScrolling.current && !inTrans() &&
        blendsSettled && hs.snap === null && vs.snap === null &&
        Math.abs(hs.target - hs.pos) < 0.0005 && Math.abs(vs.target - vs.pos) < 0.0005 &&
        Math.abs(distAmt) < 0.001 && Math.abs(distTarget) < 0.001 &&
        maxOpacityDelta < 0.0005
      if (!settled) {
        renderer.render(scene, camera)
        needsRender = false
      }
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      clearTimeout(scrollTimerRef.current)
      timers.forEach(clearTimeout)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('click',      onClick)
      window.removeEventListener('resize',     resize)
      ro.disconnect()
      renderer.dispose()
      meshes.forEach(m => { m.geometry.dispose(); m.material.dispose(); if (m.material.map) m.material.map.dispose() })
      burstRef.current = null
    }
  }, [slides])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
})

export default HeroCanvas
