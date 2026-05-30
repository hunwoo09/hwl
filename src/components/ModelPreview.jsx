import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Environment } from '@react-three/drei'

function RotatingModel({ url }) {
  const { scene } = useGLTF(url)
  const cloned  = useMemo(() => scene.clone(true), [scene])
  const groupRef = useRef()

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.2
    groupRef.current.position.y  = Math.sin(clock.elapsedTime * 0.45) * 0.07
  })

  return (
    <group ref={groupRef}>
      <Center>
        <primitive object={cloned} />
      </Center>
    </group>
  )
}

export default function ModelPreview({ url }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.6, 4.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Key light — warm, from upper-right */}
      <directionalLight position={[4, 7, 4]}  intensity={2.0} color="#fff6ee" />
      {/* Fill light — cool, from lower-left */}
      <directionalLight position={[-3, 1, -3]} intensity={0.5} color="#b0c8e8" />
      {/* Rim light — from behind for silhouette depth */}
      <directionalLight position={[0, -2, -5]} intensity={0.3} color="#c0d8f0" />
      {/* Very subtle ambient so shadowed areas aren't pure black */}
      <ambientLight intensity={0.08} />
      {/* Environment for reflections on metal/glass materials */}
      <Environment preset="city" />
      <Suspense fallback={null}>
        <RotatingModel url={url} />
      </Suspense>
    </Canvas>
  )
}
