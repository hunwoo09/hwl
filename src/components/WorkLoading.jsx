import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'

const HOLD_MS    = 2500   // how long the screen stays fully visible
const FADE_MS    = 600    // fade-out duration (must match CSS transition below)

function SpinningModel({ url }) {
  const { scene } = useGLTF(url)
  const cloned    = useMemo(() => scene.clone(true), [scene])
  const groupRef  = useRef()

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 1.8
  })

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={cloned} />
      </Center>
    </group>
  )
}

export default function WorkLoading({ glbUrl, onComplete }) {
  const [opacity,    setOpacity]    = useState(0)
  const [fadingOut,  setFadingOut]  = useState(false)
  const [unmounted,  setUnmounted]  = useState(false)

  useEffect(() => {
    // Fade in on first frame
    const raf = requestAnimationFrame(() => setOpacity(1))

    const t1 = setTimeout(() => setFadingOut(true),  HOLD_MS)
    const t2 = setTimeout(() => {
      setUnmounted(true)
      onComplete?.()
    }, HOLD_MS + FADE_MS)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onComplete])

  if (unmounted) return null

  return (
    <div style={{
      position:   'fixed',
      inset:      0,
      zIndex:     200,
      background: '#000',
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      opacity:    fadingOut ? 0 : opacity,
      transition: fadingOut
        ? `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`
        : 'opacity 0.35s ease',
    }}>

      {/* 3D canvas */}
      <div style={{ position: 'relative', width: 300, height: 300 }}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.5, 4.5], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <ambientLight intensity={0.1} />
          <directionalLight position={[4, 7, 4]}  intensity={2.2} color="#ffffff" />
          <directionalLight position={[-3, 1, -3]} intensity={0.5} color="#b0c8e8" />
          <directionalLight position={[0, -2, -4]} intensity={0.3} color="#c0d8f0" />
          <Suspense fallback={null}>
            <SpinningModel url={glbUrl} />
          </Suspense>
        </Canvas>
      </div>

      {/* Progress line */}
      <div style={{
        width:        180,
        height:       1,
        background:   'rgba(255,255,255,0.08)',
        marginTop:    28,
        overflow:     'hidden',
      }}>
        <div style={{
          height:    '100%',
          width:     '100%',
          background: 'rgba(255,255,255,0.55)',
          transformOrigin: 'left center',
          transform:  'scaleX(0)',
          animation:  `workLoadLine ${HOLD_MS}ms cubic-bezier(0.4,0,0.6,1) forwards`,
        }} />
      </div>

    </div>
  )
}
