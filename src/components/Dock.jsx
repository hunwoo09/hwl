import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

const APPS = [
  {
    id: 'photoshop',
    name: 'Photoshop',
    color: '#31A8FF',
    accentColor: '#001933',
    icon: '/icons/photoshop.png',
    projects: [],
    menuItems: ['File', 'Edit', 'Image', 'Layer', 'Select', 'Filter', 'View', 'Window'],
    sideTools: ['V', 'M', 'L', 'W', 'C', 'E', 'S', 'T'],
  },
  {
    id: 'illustrator',
    name: 'Illustrator',
    color: '#FF9A00',
    accentColor: '#1C0F00',
    icon: '/icons/illustrator.png',
    projects: [],
    menuItems: ['File', 'Edit', 'Object', 'Type', 'Select', 'Effect', 'View', 'Window'],
    sideTools: ['V', 'A', 'P', 'B', 'T', 'L', 'M', 'R'],
  },
  {
    id: 'blender',
    name: 'Blender',
    color: '#EA7600',
    accentColor: '#150D00',
    icon: '/icons/blender.png',
    projects: [],
    menuItems: ['File', 'Edit', 'Render', 'Window', 'Help'],
    sideTools: ['S', 'G', 'R', 'E', 'F', 'K', 'C', 'B'],
  },
  {
    id: 'aftereffects',
    name: 'After Effects',
    color: '#9999FF',
    accentColor: '#0D0D1F',
    icon: '/icons/aftereffects.png',
    projects: [],
    menuItems: ['File', 'Edit', 'Composition', 'Layer', 'Effect', 'Animation', 'View', 'Window'],
    sideTools: ['V', 'H', 'Z', 'W', 'Q', 'G', 'P', 'R'],
  },
]

export default function Dock() {
  const dockRef = useRef(null)
  const overlayRef = useRef(null)
  const contentRef = useRef(null)
  const [activeApp, setActiveApp] = useState(null)

  useEffect(() => {
    gsap.fromTo(
      dockRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' }
    )
  }, [])

  const openApp = (app) => {
    setActiveApp(app)
    setTimeout(() => {
      if (!overlayRef.current) return
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      )
      gsap.fromTo(contentRef.current,
        { opacity: 0, scale: 0.98, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'power3.out' }
      )
    }, 10)
  }

  const closeApp = () => {
    gsap.to(overlayRef.current, {
      opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => setActiveApp(null),
    })
  }

  return (
    <>
      {/* 풀스크린 앱 오버레이 */}
      {activeApp && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            opacity: 0,
            background: activeApp.accentColor,
          }}
        >
          {/* 맥OS 타이틀바 */}
          <div
            className="flex items-center justify-between px-4 h-7 shrink-0"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            {/* 신호등 버튼 */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={closeApp}
                className="w-3 h-3 rounded-full flex items-center justify-center group"
                style={{ background: '#FF5F57' }}
              >
                <span className="opacity-0 group-hover:opacity-100 text-[8px] text-black font-bold">×</span>
              </button>
              <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
            </div>

            {/* 앱 이름 */}
            <div className="flex items-center gap-2">
              <img src={activeApp.icon} alt={activeApp.name} className="w-4 h-4 object-contain" />
              <span className="text-[#aaa] text-xs">
                {activeApp.name} — Portfolio
              </span>
            </div>

            <div className="w-16" />
          </div>

          {/* 메뉴바 */}
          <div
            className="flex items-center gap-1 px-3 h-7 shrink-0"
            style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {activeApp.menuItems.map((item) => (
              <span key={item} className="text-[#aaa] text-[11px] px-2 py-0.5 rounded hover:bg-white/10 cursor-default transition-colors">
                {item}
              </span>
            ))}
          </div>

          {/* 메인 영역 */}
          <div ref={contentRef} className="flex flex-1 overflow-hidden" style={{ opacity: 0 }}>

            {/* 왼쪽 툴바 */}
            <div
              className="flex flex-col items-center gap-1 py-3 px-1 shrink-0"
              style={{
                width: '36px',
                background: 'rgba(0,0,0,0.3)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {activeApp.sideTools.map((tool, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#888] text-[10px] font-mono hover:bg-white/10 hover:text-white cursor-default transition-colors"
                >
                  {tool}
                </div>
              ))}
            </div>

            {/* 캔버스 영역 */}
            <div
              className="flex-1 overflow-auto p-8"
              style={{ background: '#1a1a1a' }}
            >
              {/* 탭바 */}
              <div
                className="flex items-center gap-0 mb-6 -mt-2"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="px-4 py-1.5 text-[11px] text-[#ccc] flex items-center gap-2"
                  style={{
                    background: '#1a1a1a',
                    borderTop: `2px solid ${activeApp.color}`,
                    borderRight: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span>Portfolio.{activeApp.id === 'blender' ? 'blend' : activeApp.id === 'aftereffects' ? 'aep' : activeApp.id === 'illustrator' ? 'ai' : 'psd'}</span>
                  <span className="text-[#555] hover:text-white cursor-pointer">×</span>
                </div>
              </div>

              {activeApp.projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${activeApp.color}22`, border: `1px solid ${activeApp.color}44` }}
                  >
                    <img src={activeApp.icon} alt="" className="w-8 h-8 object-contain opacity-50" />
                  </div>
                  <p className="text-[#333] text-xs tracking-[0.3em] uppercase">No projects yet</p>
                  <p className="text-[#222] text-[10px]">Add projects in Sanity CMS with tool: {activeApp.id}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {activeApp.projects.map((project, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div
                        className="aspect-video rounded overflow-hidden mb-2"
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {project.image && (
                          <img
                            src={project.image}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                      </div>
                      <p className="text-[#aaa] text-xs truncate">{project.title}</p>
                      <p className="text-[#444] text-[10px] mt-0.5">{project.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 오른쪽 패널 */}
            <div
              className="shrink-0 py-3 px-2"
              style={{
                width: '180px',
                background: 'rgba(0,0,0,0.25)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase mb-3 px-1">Properties</p>
              {['Opacity', 'Blend', 'Size', 'Rotation'].map((prop) => (
                <div key={prop} className="flex items-center justify-between px-1 py-1.5 rounded hover:bg-white/5">
                  <span className="text-[#555] text-[10px]">{prop}</span>
                  <span className="text-[#333] text-[10px] font-mono">—</span>
                </div>
              ))}

              <div className="mt-4 px-1">
                <p className="text-[#444] text-[9px] tracking-[0.3em] uppercase mb-2">Layers</p>
                {(activeApp.projects.length > 0 ? activeApp.projects : [{ title: 'Background' }, { title: 'Layer 1' }]).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-1 cursor-default">
                    <div className="w-1.5 h-1.5 rounded-sm" style={{ background: activeApp.color + '88' }} />
                    <span className="text-[#555] text-[10px] truncate">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 하단 상태바 */}
          <div
            className="flex items-center justify-between px-4 h-5 shrink-0"
            style={{ background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <span className="text-[#333] text-[9px] font-mono">Doc: 0B/0B</span>
            <span className="text-[#333] text-[9px] font-mono">100%</span>
          </div>
        </div>
      )}

      {/* Dock */}
      <div
        ref={dockRef}
        className="fixed bottom-6 left-1/2 z-50"
        style={{
          transform: 'translateX(-50%)',
          opacity: 0,
          background: 'rgba(18,18,18,0.7)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
        }}
      >
        {APPS.map((app) => (
          <DockIcon
            key={app.id}
            app={app}
            isActive={activeApp?.id === app.id}
            onClick={openApp}
          />
        ))}
      </div>
    </>
  )
}

function DockIcon({ app, isActive, onClick }) {
  const iconRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = () => {
    setHovered(true)
    gsap.to(iconRef.current, { y: -10, scale: 1.25, duration: 0.2, ease: 'power2.out' })
  }

  const handleMouseLeave = () => {
    setHovered(false)
    gsap.to(iconRef.current, { y: 0, scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' })
  }

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ cursor: 'pointer' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(app)}
    >
      {hovered && (
        <div
          className="absolute -top-8 left-1/2 text-[#f5f0eb] text-[10px] tracking-widest whitespace-nowrap px-2 py-1 rounded"
          style={{ transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          {app.name}
        </div>
      )}
      <div ref={iconRef} className="w-14 h-14" style={{ background: 'transparent' }}>
        <img src={app.icon} alt={app.name} className="w-full h-full object-contain drop-shadow-lg" />
      </div>
      <div
        className="w-1 h-1 rounded-full mt-1 transition-all duration-200"
        style={{ background: isActive ? app.color : 'transparent' }}
      />
    </div>
  )
}