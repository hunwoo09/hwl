import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { client } from '../sanityClient'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '')
    .replace(/-(\w+)$/, '.$1')}`
}

export default function ArchivePage() {
  const [projects, setProjects] = useState([])
  const gridRef = useRef(null)
  const headingRef = useRef(null)

  useEffect(() => {
    client.fetch(`*[_type == "project" && (category == "archive" || category == ".archive")] | order(orderRank asc, _createdAt desc)`)
      .then((data) => setProjects(data))
  }, [])

  useEffect(() => {
    if (!gridRef.current || projects.length === 0) return
    gsap.fromTo(headingRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    )
    gsap.fromTo(gridRef.current.children,
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out', delay: 0.15, clearProps: 'opacity,transform' }
    )
  }, [projects])

  return (
    <section className="min-h-screen px-10 pt-28 pb-24" style={{ backgroundColor: '#000000' }}>
      <div ref={headingRef} className="mb-14" style={{ opacity: 0 }}>
        <p className="font-sans text-[#aaa] text-[10px] tracking-[0.4em] uppercase mb-3">Collection</p>
        <h1 className="font-serif text-[#f0ece6] text-6xl font-light italic tracking-tight">Archive</h1>
      </div>

      {projects.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="font-sans text-[#ccc] text-[10px] tracking-[0.4em] uppercase">No projects yet</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {projects.map((project, i) => (
            <Link key={project._id} to={`/work/${project._id}`} className="group block">
              <div className="overflow-hidden aspect-square" style={{ backgroundColor: '#000000' }}>
                {project.coverImage && (
                  <img
                    src={imageUrl(project.coverImage.asset._ref)}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                )}
              </div>
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-[#f0ece6] text-base font-light tracking-tight">{project.title}</h3>
                  <p className="font-sans text-[#aaa] text-[10px] mt-1 tracking-widest uppercase">{project.location}</p>
                </div>
                <span className="font-sans text-[#ccc] text-[10px] tracking-widest mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
