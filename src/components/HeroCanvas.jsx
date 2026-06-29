// Single Three.js canvas for both slider (H) and list (V) modes.
// Meshes animate between horizontal and vertical layouts on mode change —
// no DOM overlay, no fake transition, just real mesh position animation.
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

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
const BLEND_DUR    = 1.1   // seconds for H↔V layout transition

const isMob = () => window.innerWidth < 768

function imgUrl(ref) {
  const base = `https://cdn.sanity.io/images/18oh8tdj/production/${ref.replace('image-', '').replace(/-(\w+)$/, '.$1')}`
  return `${base}?w=${isMob() ? 600 : 1200}&q=80&fm=webp&fit=clip`
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
      onStart: () => burstRef.current?.(0.8),
    })

    // Per-mesh staggered blend — center image first, outer images delayed
    const target = mode === 'v' ? 1 : 0
    const n      = meshBlendsRef.current.length
    meshBlendsRef.current.forEach((blend, i) => {
      const dist  = Math.min(Math.abs(i - ai), n - Math.abs(i - ai))
      const delay = dist * 0.08
      gsap.killTweensOf(blend)
      gsap.to(blend, { v: target, duration: BLEND_DUR, delay, ease: 'back.out(1.8)' })
    })
  }, [mode])

  // ── Main Three.js effect ──────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !slides.length) return

    // renderer / camera
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
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
    for (let i = 0; i < n; i++) {
      const geo = new THREE.PlaneGeometry(slideWidths[i], SLIDE_H, 32, 16)
      const mat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, color: 0x1a1a1a, transparent: true, opacity: 0.28,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.userData = { origVerts: [...geo.attributes.position.array], index: i }
      scene.add(mesh); meshes.push(mesh)
    }

    // Init per-mesh blends to match current global blend
    meshBlendsRef.current = Array.from({ length: n }, () => ({ v: blendObj.current.v }))

    // ── Motion trail ghost meshes (3 per slide) ───────────────────────────
    const TRAIL_COUNT = 3
    const TRAIL_OPACITIES = [0.38, 0.18, 0.07]
    const trailMeshes = []      // trailMeshes[i][t] = ghost mesh
    const trailPositions = []   // trailPositions[i] = ring buffer of {x,y}
    for (let i = 0; i < n; i++) {
      trailPositions.push([])
      trailMeshes.push([])
      for (let t = 0; t < TRAIL_COUNT; t++) {
        const tGeo = new THREE.PlaneGeometry(slideWidths[i], SLIDE_H)
        const tMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0 })
        const tMesh = new THREE.Mesh(tGeo, tMat)
        scene.add(tMesh)
        trailMeshes[i].push(tMesh)
      }
    }

    const loadOrder = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a) - Math.abs(b))
    loadOrder.forEach((i, rank) => {
      if (!slides[i]?.imageRef) return
      const t = setTimeout(() => {
        loader.load(imgUrl(slides[i].imageRef), tex => {
          tex.colorSpace = THREE.SRGBColorSpace
          meshes[i].material.map = tex
          meshes[i].material.color.set(0xffffff)
          meshes[i].material.needsUpdate = true
          // Sync texture to trail ghosts
          trailMeshes[i].forEach(tm => {
            tm.material.map = tex
            tm.material.color.set(0xffffff)
            tm.material.needsUpdate = true
          })
        })
      }, rank === 0 ? 0 : rank * (isMob() ? 120 : 40))
      timers.push(t)
    })

    // ── Distortion ────────────────────────────────────────────────────────
    // Blends between horizontal wave (H-mode) and vertical wave (V-mode)
    function distort(mesh, hX, vY, bv, strength) {
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
      mesh.geometry.computeVertexNormals()
    }

    // ── Local state (RAF closure) ──────────────────────────────────────────
    let distAmt = 0, distTarget = 0, velPeak = 0
    const velHist = [0, 0, 0, 0, 0]
    let lastTime = 0
    let isDragging = false, dragPrev = { x: 0, y: 0 }, totalDragDelta = 0
    const dragVelWin = [0, 0, 0, 0, 0]
    let touchPrev = { x: 0, y: 0 }, touchOrigin = { x: 0, y: 0 }
    let curActiveIdx = -1

    const wrap = (v, r) => ((v % r) + r) % r
    const isH  = () => blendObj.current.v < 0.5
    const inTrans = () => blendObj.current.v > 0.02 && blendObj.current.v < 0.98

    const burstDistort = a => { distTarget = Math.min(1, Math.abs(distTarget) + a) }
    burstRef.current = burstDistort

    // ── Input ─────────────────────────────────────────────────────────────
    const onWheel = e => {
      e.preventDefault()
      if (inTrans()) return
      const raw   = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), WHEEL_MAX)
      if (isH()) {
        hScroll.current.snap = null
        hScroll.current.target -= delta * WHEEL_SPEED
      } else {
        vScroll.current.snap = null
        vScroll.current.target += delta * WHEEL_SPEED
      }
      isScrolling.current = true
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => { isScrolling.current = false }, 400)
    }

    const onTouchStart = e => {
      if (inTrans()) return
      touchOrigin.x = touchPrev.x = e.touches[0].clientX
      touchOrigin.y = touchPrev.y = e.touches[0].clientY
      isScrolling.current = true
      hScroll.current.momentum = 0; vScroll.current.momentum = 0
    }
    const onTouchMove = e => {
      e.preventDefault(); if (inTrans()) return
      const dx = e.touches[0].clientX - touchPrev.x
      const dy = e.touches[0].clientY - touchPrev.y
      touchPrev.x = e.touches[0].clientX; touchPrev.y = e.touches[0].clientY
      if (isH()) { hScroll.current.snap = null; hScroll.current.target += dx * 0.01 }
      else        { vScroll.current.snap = null; vScroll.current.target += dy * 0.01 }
    }
    const onTouchEnd = () => {
      if (isH()) {
        const vel = (touchPrev.x - touchOrigin.x) * 0.005
        if (Math.abs(vel) > 0.1) { hScroll.current.momentum = vel * 0.1; isScrolling.current = true; setTimeout(() => { isScrolling.current = false }, 800) }
        else setTimeout(() => { isScrolling.current = false }, 400)
      } else {
        const vel = (touchPrev.y - touchOrigin.y) * 0.005
        if (Math.abs(vel) > 0.1) { vScroll.current.momentum = vel * 0.1; isScrolling.current = true; setTimeout(() => { isScrolling.current = false }, 800) }
        else setTimeout(() => { isScrolling.current = false }, 400)
      }
    }

    const onMouseDown = e => {
      if (e.button !== 0 || inTrans()) return
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
        hs.target += hs.momentum; hs.momentum *= MOM_FRICTION; if (Math.abs(hs.momentum) < 0.001) hs.momentum = 0
        vs.target += vs.momentum; vs.momentum *= MOM_FRICTION; if (Math.abs(vs.momentum) < 0.001) vs.momentum = 0
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

        // Closest to screen center (use global bv for mode determination)
        const dist = bv < 0.5 ? Math.abs(hX) : Math.abs(vY)
        if (dist < closestDist) { closestDist = dist; closestIdx = i; closestHX = hX; closestVY = vY }

        distort(mesh, hX, vY, mbv, sD * DISTORT_STR)

        // Motion trail — push current position into ring buffer, place ghosts at older ones
        const meshMoving = Math.abs(mbv - Math.round(mbv)) > 0.01
        const buf = trailPositions[i]
        buf.unshift({ x: mesh.position.x, y: mesh.position.y })
        if (buf.length > TRAIL_COUNT + 1) buf.pop()
        trailMeshes[i].forEach((tm, t) => {
          const old = buf[t + 1]
          const targetOp = (meshMoving && old) ? TRAIL_OPACITIES[t] * mesh.material.opacity : 0
          tm.material.opacity += (targetOp - tm.material.opacity) * 0.35
          if (old) { tm.position.x = old.x; tm.position.y = old.y }
        })
      })

      // Snap to center when idle
      if (!isDragging && !isScrolling.current && !inTrans()) {
        if (bv < 0.5) {
          if (hs.snap === null && Math.abs(closestHX) > 0.005) hs.snap = hs.pos - closestHX
          if (hs.snap !== null) {
            hs.target = hs.snap
            if (Math.abs(hs.pos - hs.snap) < 0.002) { hs.pos = hs.target = hs.snap; hs.snap = null }
          }
        } else {
          if (vs.snap === null && Math.abs(closestVY) > 0.005) vs.snap = vs.pos - closestVY
          if (vs.snap !== null) {
            vs.target = vs.snap
            if (Math.abs(vs.pos - vs.snap) < 0.002) { vs.pos = vs.target = vs.snap; vs.snap = null }
          }
        }
      }

      // Dim inactive
      meshes.forEach(mesh => {
        const t = mesh.userData.index === closestIdx ? 1.0 : 0.28
        mesh.material.opacity += (t - mesh.material.opacity) * 0.12
      })

      if (closestIdx !== curActiveIdx) {
        curActiveIdx = closestIdx
        activeIdxRef.current = closestIdx
        cbsRef.current.onActiveChange?.(closestIdx)
      }

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
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
      trailMeshes.forEach(group => group.forEach(tm => { tm.geometry.dispose(); tm.material.dispose() }))
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
