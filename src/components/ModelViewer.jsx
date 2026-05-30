// 📁 파일: src/components/ModelViewer.jsx
// 위치: C:\Users\Hunwoo\Desktop\my-portfolio\src\components\ModelViewer.jsx

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ─────────────────────────────────────────────
// Scanline Shader (후처리)
// ─────────────────────────────────────────────
const ScanlineShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uTime:      { value: 0 },
    uSpacing:   { value: 6.0 },   // 라인 간격 (px)
    uThickness: { value: 1.5 },   // 라인 두께 (px)
    uSpeed:     { value: 0.6 },   // 스크롤 속도
    uOpacity:   { value: 0.55 },  // 라인 불투명도
    uColor:     { value: new THREE.Vector3(0.863, 0.941, 1.0) }, // 라인 색상 (하늘빛 흰색)
    uResolution:{ value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uSpacing;
    uniform float uThickness;
    uniform float uSpeed;
    uniform float uOpacity;
    uniform vec3  uColor;
    uniform vec2  uResolution;
    varying vec2 vUv;

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);

      // 스크린 좌표 (px 단위)
      float y = vUv.y * uResolution.y;

      // 위→아래로 흐르는 오프셋
      float scrolled = mod(y - uTime * uSpeed * uResolution.y * 0.12, uSpacing);

      // 라인 마스크: scrolled < thickness 이면 라인
      float lineMask = step(scrolled, uThickness);

      // 라인 색상 블렌드
      vec3 lineColor = uColor * lineMask * uOpacity;
      vec3 finalColor = base.rgb + lineColor;

      gl_FragColor = vec4(finalColor, base.a);
    }
  `,
};

// ─────────────────────────────────────────────
// Slider UI 컴포넌트
// ─────────────────────────────────────────────
function SliderPanel({ spacing, thickness, onSpacingChange, onThicknessChange }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: '28px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        padding: '28px 22px',
        background: 'rgba(8, 8, 16, 0.72)',
        border: '1px solid rgba(140, 200, 255, 0.13)',
        borderRadius: '16px',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        zIndex: 10,
        minWidth: '170px',
        boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
        fontFamily: '"Noto Sans Mono", monospace',
      }}
    >
      <div style={{ color: 'rgba(140,200,255,0.5)', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '-10px' }}>
        Scanline
      </div>

      {/* Spacing */}
      <SliderItem
        label="Spacing"
        value={spacing}
        min={2}
        max={24}
        step={0.5}
        onChange={onSpacingChange}
        displayValue={`${spacing.toFixed(1)}px`}
      />

      {/* Thickness */}
      <SliderItem
        label="Thickness"
        value={thickness}
        min={0.2}
        max={6}
        step={0.1}
        onChange={onThicknessChange}
        displayValue={`${thickness.toFixed(1)}px`}
      />
    </div>
  );
}

function SliderItem({ label, value, min, max, step, onChange, displayValue }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: 'rgba(200,225,255,0.75)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ color: 'rgba(140,200,255,0.9)', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
          {displayValue}
        </span>
      </div>

      {/* Custom styled range input */}
      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        {/* Track background */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '2px',
          background: 'rgba(140,200,255,0.12)', borderRadius: '2px',
        }} />
        {/* Track fill */}
        <div style={{
          position: 'absolute', left: 0, width: `${pct}%`, height: '2px',
          background: 'rgba(140,200,255,0.7)', borderRadius: '2px',
          transition: 'width 0.05s',
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute', left: 0, right: 0,
            width: '100%', height: '20px',
            opacity: 0, cursor: 'pointer', margin: 0,
          }}
        />
        {/* Thumb indicator */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 6px)`,
          width: '12px', height: '12px',
          borderRadius: '50%',
          background: '#8cc8ff',
          boxShadow: '0 0 8px rgba(140,200,255,0.8)',
          pointerEvents: 'none',
          transition: 'left 0.05s',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function ModelViewer({ className = '' }) {
  const containerRef = useRef(null);
  const sceneRef     = useRef({});

  const [spacing,   setSpacing]   = useState(6.0);
  const [thickness, setThickness] = useState(1.5);

  // 슬라이더 → shader uniform 동기화
  const handleSpacing = useCallback((v) => {
    setSpacing(v);
    if (sceneRef.current.scanPass) {
      sceneRef.current.scanPass.uniforms.uSpacing.value = v;
    }
  }, []);

  const handleThickness = useCallback((v) => {
    setThickness(v);
    if (sceneRef.current.scanPass) {
      sceneRef.current.scanPass.uniforms.uThickness.value = v;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070f');

    // ── Camera ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 1000);
    camera.position.set(0, 0, 4);

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── Post-processing ─────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const scanPass = new ShaderPass(ScanlineShader);
    scanPass.uniforms.uResolution.value.set(W, H);
    scanPass.uniforms.uSpacing.value   = spacing;
    scanPass.uniforms.uThickness.value = thickness;
    composer.addPass(scanPass);
    sceneRef.current.scanPass = scanPass;

    // ── Lighting ────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x8cc8ff, 1.5);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.8);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    // ── HDR Environment ─────────────────────────────────────
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load('/monochrome_studio_02_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    });

    // ── 3D Model ────────────────────────────────────────────
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const loader = new GLTFLoader();
    loader.load(
      '/hwl.glb',
      (gltf) => {
        const model = gltf.scene;

        // 모델 크기 자동 맞춤
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.2 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        modelGroup.add(model);
      },
      undefined,
      (err) => console.error('GLB load error:', err)
    );

    // ── Mouse → 모델 회전 ────────────────────────────────────
    const mouse    = { x: 0, y: 0 };
    const targetRot = { x: 0, y: 0 };
    const currentRot = { x: 0, y: 0 };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      mouse.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Resize ──────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      scanPass.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animation loop ───────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // 스캔라인 시간
      scanPass.uniforms.uTime.value = elapsed;

      // 마우스 따라 부드럽게 회전 (lerp)
      targetRot.y =  mouse.x * Math.PI * 0.4;
      targetRot.x = -mouse.y * Math.PI * 0.2;
      currentRot.x += (targetRot.x - currentRot.x) * 0.06;
      currentRot.y += (targetRot.y - currentRot.y) * 0.06;

      modelGroup.rotation.x = currentRot.x;
      modelGroup.rotation.y = currentRot.y;

      // 아주 미세한 부유 모션
      modelGroup.position.y = Math.sin(elapsed * 0.6) * 0.04;

      composer.render();
    };
    animate();

    // ── Cleanup ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      composer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      className={className}
    >
      {/* Three.js 캔버스 컨테이너 */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 슬라이더 패널 */}
      <SliderPanel
        spacing={spacing}
        thickness={thickness}
        onSpacingChange={handleSpacing}
        onThicknessChange={handleThickness}
      />

      {/* 좌하단 힌트 */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '24px',
        color: 'rgba(140,200,255,0.3)',
        fontSize: '10px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        fontFamily: '"Noto Sans Mono", monospace',
        pointerEvents: 'none',
      }}>
        Move cursor to rotate
      </div>
    </div>
  );
}
