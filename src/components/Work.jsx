import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { client } from '../sanityClient'

gsap.registerPlugin(ScrollTrigger)

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

export default function Work() {
  const [projects, setProjects] = useState([])
  const [activeCategory, setActiveCategory] = useState('.jpg')
  const sectionRef = useRef(null)
  const headingRef = useRef(null)
  const gridRef = useRef(null)

  useEffect(() => {
    client.fetch(`*[_type == "project"] | order(orderRank asc, _createdAt desc)`)
      .then((data) => {
        setProjects(data)
      })
      .catch((err) => {
        console.error('Sanity error:', err.message, err.statusCode)
      })
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(headingRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: headingRef.current, start: 'top 85%' }
        }
      )
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  const normalize = s => s?.replace(/^\./, '').toLowerCase()
  const filtered = projects.filter(p => normalize(p.category) === normalize(activeCategory))
  const categories = [
    { key: '.jpg', label: '.jpg' },
    { key: '.mp4', label: '.mp4' },
    { key: '.obj', label: '.obj' },
  ]

  return (
    <section
      ref={sectionRef}
      id="work"
      className="min-h-screen px-10 py-24"
      style={{ background: '#000000' }}
    >
      {/* ?뱀뀡 ?ㅻ뜑 */}
      <div
        ref={headingRef}
        className="flex items-end justify-between mb-16"
        style={{ opacity: 0 }}
      >
        <div>
          <p className="text-[#444] text-[10px] tracking-[0.35em] uppercase mb-2">
            Selected Works
          </p>
          <h2 className="text-[#ffffff] text-4xl font-black tracking-[-0.03em]">
            Projects
          </h2>
        </div>

        {/* 移댄뀒怨좊━ ?꾪꽣 */}
        <nav className="flex gap-6">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`text-xs tracking-[0.25em] uppercase pb-1 transition-all duration-300 ${
                activeCategory === key
                  ? 'text-[#ffffff] border-b border-[#ffffff]'
                  : 'text-[#444] hover:text-[#888]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* 洹몃━??*/}
      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {filtered.map((project, i) => (
          <div
            key={project._id}
            className="group cursor-pointer"
          >
            <div className="overflow-hidden aspect-square bg-[#111]">
              {project.coverImage ? (
                <img
                  src={imageUrl(project.coverImage.asset._ref)}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[#222] text-xs tracking-widest">No image</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <h3 className="text-[#ffffff] text-sm font-medium tracking-tight">
                  {project.title}
                </h3>
                <p className="text-[#444] text-xs mt-1 tracking-widest uppercase">
                  {project.location}
                </p>
              </div>
              <span className="text-[#333] text-[10px] tracking-widest mt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-[#222] text-sm tracking-[0.3em] uppercase">
            No projects yet
          </p>
        </div>
      )}
    </section>
  )
}
