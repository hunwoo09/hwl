import { useEffect, useState, useRef, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

const MONO = '"Noto Sans Mono", monospace'
const PAD  = 40   // horizontal padding px
const GAP  = 20   // gap between cells px
const HEAD = 200  // height reserved for heading px
const BOT  = 80   // bottom padding px

function getCols() { return window.innerWidth < 640 ? 2 : 3 }

function sanityUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

// ── GLSL ────────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAG = /* glsl */`
uniform sampler2D uTex;
uniform float uHover;
uniform float uReveal;
varying vec2 vUv;

void main() {
  // Bottom-up wipe entrance
  float soft = 0.06;
  float mask = smoothstep(1.0 - uReveal - soft, 1.0 - uReveal + soft, vUv.y);
  if (mask < 0.001) discard;

  // RGB split on hover
  float ab = uHover * 0.016;
  float r = texture2D(uTex, vUv + vec2( ab, 0.0)).r;
  float g = texture2D(uTex, vUv).g;
  float b = texture2D(uTex, vUv + vec2(-ab, 0.0)).b;
  float a = texture2D(uTex, vUv).a;

  // Dim at rest, brighten on hover
  float lum = mix(0.65, 1.0, uHover);
  gl_FragColor = vec4(r * lum, g * lum, b * lum, a * mask);
}
`

// Alternating parallax speeds per row — creates depth illusion while scrolling
const ROW_PARALLAX = [0.030, -0.018, 0.038, -0.024, 0.020, -0.032]

// ── Single image card (mesh + HTML label) ────────────────────────────────────

function ImageCard({ url, baseX, baseY, size, row, index, delay, scrollY, title, location, onClick }) {
  const group  = useRef()
  const mat    = useRef()
  const tex    = useTexture(url)
  const [hov, setHov] = useState(false)
  const hovVal = useRef(0)
  const revVal = useRef(0)
  const pFac   = ROW_PARALLAX[row % ROW_PARALLAX.length]

  tex.minFilter   = THREE.LinearFilter
  tex.generateMipmaps = false

  // Staggered entrance
  useEffect(() => {
    const t = setTimeout(() => {
      gsap.to(revVal, { current: 1, duration: 1.1, ease: 'power3.out' })
    }, delay)
    return () => clearTimeout(t)
  }, [delay])

  useFrame(() => {
    if (!group.current || !mat.current) return
    hovVal.current += ((hov ? 1 : 0) - hovVal.current) * 0.09
    mat.current.uniforms.uHover.value  = hovVal.current
    mat.current.uniforms.uReveal.value = revVal.current
    // Parallax: shift Y based on scroll and row factor
    group.current.position.y = baseY + pFac * scrollY.current
  })

  return (
    <group ref={group} position={[baseX, baseY, 0]}>
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerEnter={() => { setHov(true);  document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { setHov(false); document.body.style.cursor = 'auto' }}
      >
        <planeGeometry args={[size, size]} />
        <shaderMaterial
          ref={mat}
          transparent
          depthWrite={false}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={{
            uTex:    { value: tex },
            uHover:  { value: 0 },
            uReveal: { value: 0 },
          }}
        />
      </mesh>

      {/* HTML label below the image */}
      <Html
        position={[0, -size / 2 - 16, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          width: size + 'px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingTop: '10px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          <div>
            <p style={{ color: '#f0ece6', fontFamily: MONO, fontSize: '13px', fontWeight: 300, margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </p>
            {location && (
              <p style={{ color: '#666', fontFamily: MONO, fontSize: '8px', letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '5px', marginBottom: 0 }}>
                {location}
              </p>
            )}
          </div>
          <span style={{ color: '#444', fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', marginTop: '2px', flexShrink: 0, marginLeft: '8px' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      </Html>
    </group>
  )
}

// ── Three.js scene ────────────────────────────────────────────────────────────

function Scene({ projects, scrollY }) {
  const navigate = useNavigate()
  const { size }  = useThree()
  const w    = size.width
  const cols = getCols()

  const cellSize = (w - PAD * 2 - GAP * (cols - 1)) / cols
  const rowH     = cellSize + GAP
  const items    = projects.filter(p => p.coverImage)

  return (
    <>
      {items.map((project, i) => {
        const col   = i % cols
        const row   = Math.floor(i / cols)
        const baseX = -w / 2 + PAD + col * (cellSize + GAP) + cellSize / 2
        // Ortho: +Y is up, canvas top = +size.height/2
        const baseY = size.height / 2 - HEAD - row * rowH - cellSize / 2

        return (
          <ImageCard
            key={project._id}
            url={sanityUrl(project.coverImage.asset._ref)}
            baseX={baseX}
            baseY={baseY}
            size={cellSize}
            row={row}
            index={i}
            delay={i * 70 + 250}
            scrollY={scrollY}
            title={project.title}
            location={project.location}
            onClick={() => navigate(`/work/${project._id}`)}
          />
        )
      })}
    </>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const [projects, setProjects]       = useState([])
  const [canvasH,  setCanvasH]        = useState(window.innerHeight)
  const headingRef = useRef(null)
  const scrollY    = useRef(0)

  useEffect(() => {
    client
      .fetch(`*[_type == "project" && (category == "archive" || category == ".archive")] | order(orderRank asc, _createdAt desc)`)
      .then(setProjects)
  }, [])

  // Recompute canvas height whenever projects or viewport width changes
  useEffect(() => {
    const compute = () => {
      const cols = getCols()
      const w    = window.innerWidth
      const cell = (w - PAD * 2 - GAP * (cols - 1)) / cols
      const rows = Math.ceil(projects.length / cols)
      setCanvasH(HEAD + rows * (cell + GAP) + BOT + 60) // +60 for label text
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [projects.length])

  // Track scroll position via ref (no re-render)
  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Heading entrance
  useEffect(() => {
    if (!headingRef.current || projects.length === 0) return
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
  }, [projects])

  return (
    <section style={{ backgroundColor: '#000', position: 'relative', height: canvasH }}>
      {/* Heading — absolutely overlaid so it doesn't affect canvas layout */}
      <div
        ref={headingRef}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          padding: '112px 40px 32px',
          opacity: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <h1 style={{
          fontFamily: MONO,
          color: '#f0ece6',
          fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
          fontWeight: 300,
          fontStyle: 'italic',
          letterSpacing: '-0.02em',
          margin: 0,
        }}>
          Archive
        </h1>
      </div>

      {/* r3f canvas fills the full section height */}
      {projects.length > 0 && (
        <Canvas
          orthographic
          camera={{ zoom: 1, near: 0.1, far: 100, position: [0, 0, 10] }}
          style={{ position: 'absolute', inset: 0 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => gl.setClearColor('#000000')}
        >
          <Suspense fallback={null}>
            <Scene projects={projects} scrollY={scrollY} />
          </Suspense>
        </Canvas>
      )}
    </section>
  )
}
