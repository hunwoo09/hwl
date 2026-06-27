import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const SLIDE_H      = 1.2
const GAP_3D       = 0.09
const SMOOTHING    = 0.065
const DISTORT_STR  = 2.4
const DISTORT_LERP = 0.1
const MOM_FRICTION = 0.95
const WHEEL_MAX    = 200
const WHEEL_SPEED  = 0.003
const DRAG_SPEED   = 0.003
const DRAG_MOM     = 0.006

function imgUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref.replace('image-', '').replace(/-(\w+)$/, '.$1')}`
}

export default function HeroCanvas({ slides, onActiveChange, onSlideClick }) {
  const canvasRef = useRef(null)
  const cbsRef    = useRef({ onActiveChange, onSlideClick, slides })
  useEffect(() => { cbsRef.current = { onActiveChange, onSlideClick, slides } })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !slides.length) return

    // ── renderer ──────────────────────────────────────────────────────────────
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

    // ── horizontal layout ────────────────────────────────────────────────────
    const n = slides.length
    const slideWidths   = slides.map(s => SLIDE_H * (s.aspectRatio ?? 1))
    const slideOffsets  = []
    let stackPos = 0
    for (let i = 0; i < n; i++) {
      const w = slideWidths[i]
      if (i === 0) { slideOffsets.push(0); stackPos = w / 2 }
      else { stackPos += GAP_3D + w / 2; slideOffsets.push(stackPos); stackPos += w / 2 }
    }
    const loopLength = stackPos + GAP_3D + slideWidths[0] / 2
    const halfLoop   = loopLength / 2

    // ── meshes ────────────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader()
    const meshes = []

    for (let i = 0; i < n; i++) {
      const w   = slideWidths[i]
      const geo = new THREE.PlaneGeometry(w, SLIDE_H, 32, 16)
      const mat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide, color: 0x1a1a1a, transparent: true, opacity: 0.28,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.userData = { origVerts: [...geo.attributes.position.array], offset: slideOffsets[i], index: i }
      if (slides[i]?.imageRef) {
        loader.load(imgUrl(slides[i].imageRef), (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true
        })
      }
      scene.add(mesh)
      meshes.push(mesh)
    }

    // ── distortion ────────────────────────────────────────────────────────────
    function distort(mesh, posX, strength) {
      const pos  = mesh.geometry.attributes.position
      const orig = mesh.userData.origVerts
      for (let i = 0; i < pos.count; i++) {
        const lx   = orig[i * 3], ly = orig[i * 3 + 1]
        const dist = Math.sqrt((posX + lx) ** 2 + ly * ly)
        const fall = Math.max(0, 1 - dist / 2)
        const bend = Math.pow(Math.sin((fall * Math.PI) / 2), 1.5)
        pos.setZ(i, bend * strength)
      }
      pos.needsUpdate = true
      mesh.geometry.computeVertexNormals()
    }

    // ── scroll state ──────────────────────────────────────────────────────────
    const wrap = (v, r) => ((v % r) + r) % r
    let scrollPos = 0, scrollTarget = 0, momentum = 0, isScrolling = false
    let distAmt = 0, distTarget = 0, velPeak = 0, scrollDir = 0, dirTarget = 0
    const velHist = [0, 0, 0, 0, 0]
    let isDragging = false, dragX = 0, dragDelta = 0
    let touchX0 = 0, touchXLast = 0
    let activeIdx = -1, lastTime = 0, scrollTimer

    const burstDistort = (a) => { distTarget = Math.min(1, distTarget + a) }

    // ── input ─────────────────────────────────────────────────────────────────
    const onWheel = (e) => {
      e.preventDefault()
      const raw   = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), WHEEL_MAX)
      burstDistort(Math.abs(delta) * 0.001)
      scrollTarget -= delta * WHEEL_SPEED
      isScrolling = true
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => (isScrolling = false), 150)
    }

    const onTouchStart = (e) => { touchX0 = touchXLast = e.touches[0].clientX; isScrolling = false; momentum = 0 }
    const onTouchMove  = (e) => {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchXLast; touchXLast = e.touches[0].clientX
      burstDistort(Math.abs(dx) * 0.015)
      scrollTarget += dx * 0.01; isScrolling = true
    }
    const onTouchEnd = () => {
      const vel = (touchXLast - touchX0) * 0.005
      if (Math.abs(vel) > 0.5) {
        momentum = vel * 0.1; burstDistort(Math.abs(vel) * 0.45)
        isScrolling = true; setTimeout(() => (isScrolling = false), 800)
      }
    }

    const onMouseDown = (e) => {
      isDragging = true; dragX = e.clientX; dragDelta = 0; momentum = 0
      canvas.style.cursor = 'grabbing'
    }
    const onMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - dragX; dragX = e.clientX; dragDelta = dx
      burstDistort(Math.abs(dx) * 0.015)
      scrollTarget += dx * DRAG_SPEED; isScrolling = true
    }
    const onMouseUp = () => {
      if (!isDragging) return
      isDragging = false; canvas.style.cursor = 'grab'
      if (Math.abs(dragDelta) > 2) {
        momentum = dragDelta * DRAG_MOM; burstDistort(Math.abs(dragDelta) * 0.005)
        isScrolling = true; setTimeout(() => (isScrolling = false), 800)
      }
    }
    const onClick = (e) => {
      if (Math.abs(dragDelta) > 8) return
      const rect = canvas.getBoundingClientRect()
      const nx   = ((e.clientX - rect.left) / rect.width)  *  2 - 1
      const ny   = -((e.clientY - rect.top)  / rect.height) *  2 + 1
      const ray  = new THREE.Raycaster()
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera)
      const hits = ray.intersectObjects(meshes)
      if (hits.length) {
        const idx = hits[0].object.userData.index
        cbsRef.current.onSlideClick?.(cbsRef.current.slides[idx])
      }
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

    // ── RAF ───────────────────────────────────────────────────────────────────
    let rafId
    function tick(time) {
      rafId = requestAnimationFrame(tick)
      const dt = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime = time

      if (isScrolling) {
        scrollTarget += momentum
        momentum *= MOM_FRICTION
        if (Math.abs(momentum) < 0.001) momentum = 0
      }

      const prev = scrollPos
      scrollPos += (scrollTarget - scrollPos) * SMOOTHING
      const fd   = scrollPos - prev

      if (Math.abs(fd) > 0.00001) dirTarget = fd > 0 ? 1 : -1
      scrollDir += (dirTarget - scrollDir) * 0.08

      const vel  = Math.abs(fd) / dt
      velHist.push(vel); velHist.shift()
      const avgV = velHist.reduce((a, b) => a + b) / 5
      if (avgV > velPeak) velPeak = avgV
      const decel = avgV / (velPeak + 0.001) < 0.7 && velPeak > 0.5
      velPeak *= 0.99

      if (vel > 0.05)          distTarget = Math.max(distTarget, Math.min(1, vel * 0.1))
      if (decel || avgV < 0.2) distTarget *= decel ? 0.95 : 0.855
      distAmt += (distTarget - distAmt) * DISTORT_LERP
      const sDistort = distAmt * scrollDir

      let closestDist = Infinity, closestIdx = 0
      meshes.forEach((mesh) => {
        const { offset } = mesh.userData
        let x = -(offset - wrap(scrollPos, loopLength))
        x = wrap(x + halfLoop, loopLength) - halfLoop
        mesh.position.x = x
        if (Math.abs(x) < closestDist) { closestDist = Math.abs(x); closestIdx = mesh.userData.index }
        if (Math.abs(x) < halfLoop + SLIDE_H * 2) distort(mesh, x, DISTORT_STR * sDistort)
      })

      // Dim inactive slides
      meshes.forEach((mesh) => {
        const target = mesh.userData.index === closestIdx ? 1.0 : 0.28
        mesh.material.opacity += (target - mesh.material.opacity) * 0.12
      })

      if (closestIdx !== activeIdx) {
        activeIdx = closestIdx
        cbsRef.current.onActiveChange?.(closestIdx)
      }

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(scrollTimer)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.removeEventListener('mousedown',  onMouseDown)
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('click',      onClick)
      window.removeEventListener('resize',     resize)
      renderer.dispose()
      meshes.forEach(m => {
        m.geometry.dispose()
        m.material.dispose()
        if (m.material.map) m.material.map.dispose()
      })
    }
  }, [slides]) // re-init when slides change (category filter)

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
