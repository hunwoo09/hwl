import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Lenis from 'lenis'
import { client } from '../sanityClient'
import { RiInstagramLine, RiMailLine, RiLinkedinLine } from '@remixicon/react'
import { useIsMobile } from '../hooks/useIsMobile'

const sequel = "'Sequel Sans Heavy Disp', 'Noto Sans Mono', monospace"

const DEFAULTS = {
  name:        'Hunwoo Lee',
  nameKorean:  '이헌우',
  role:        'Visual Artist',
  location:    'Chicago, USA',
  bio:         '',
  education: [
    { abbr: 'DEMS',  full: 'Dhahran Elementary Middle School',   years: '2015–2019' },
    { abbr: 'TASIS', full: 'The American School In Switzerland',  years: '2019–2023' },
    { abbr: 'SAIC',  full: 'School of Arts Institute of Chicago', years: '2023–'     },
  ],
  exhibitions: [
    { title: '"Mind Mapped"',     event: 'Art-Bash 2024',                venue: 'SAIC' },
    { title: '"Passport Portal"', event: 'Intervening the Archive 2024', venue: 'SAIC' },
    { title: '"Collage"',         event: 'KUAA CONNECT 2024',            venue: ''     },
  ],
  experiences: [
    { role: 'Intern',        org: 'Korean Galleries Corp.', sub: '한국화랑협회' },
    { role: 'Design Intern', org: 'KIAF 2024',              sub: ''              },
  ],
}

export default function AboutPage() {
  const isMobile     = useIsMobile()
  const [data, setData] = useState(null)
  const mobileRef = useRef(null)
  const leftRef   = useRef(null)
  const rightRef  = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    let rafId
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    client.fetch(`*[_type == "about" && _id == "about"][0]`).then(doc => {
      if (doc) setData(doc)
    })
  }, [])

  useEffect(() => {
    const els = []
    if (mobileRef.current) els.push(...Array.from(mobileRef.current.children))
    if (leftRef.current)   els.push(...Array.from(leftRef.current.children))
    if (rightRef.current)  els.push(...Array.from(rightRef.current.children))
    if (!els.length) return
    gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.0, stagger: 0.08, ease: 'power3.out', delay: 0.1 })
  }, [])

  const d = data ?? DEFAULTS

  const sectionLabel = (index, label) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '28px' }}>
      <span style={{ fontFamily: sequel, fontSize: '10px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#cccccc' }}>
        {index}
      </span>
      <span style={{ fontFamily: sequel, fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 1.6vw, 1.3rem)', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaaaaa' }}>
        {label}
      </span>
    </div>
  )

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '24px',
    padding: isMobile ? '16px 0' : '20px 0',
    borderBottom: '1px solid rgba(15,19,25,0.18)',
  }

  const SocialButtons = () => (
    (d.social?.instagram || d.social?.email || d.social?.linkedin) ? (
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '16px' }}>
        {d.social?.instagram && (
          <a href={d.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-400 hover:text-black transition-colors">
            <RiInstagramLine size={28} />
          </a>
        )}
        {d.social?.email && (
          <a href={`mailto:${d.social.email}`} aria-label="Email" className="text-gray-400 hover:text-black transition-colors">
            <RiMailLine size={28} />
          </a>
        )}
        {d.social?.linkedin && (
          <a href={d.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-400 hover:text-black transition-colors">
            <RiLinkedinLine size={28} />
          </a>
        )}
      </div>
    ) : null
  )

  const Copyright = () => (
    <div style={{ position: 'fixed', bottom: '20px', left: '24px', zIndex: 10, pointerEvents: 'none' }}>
      <span style={{ fontFamily: "'Sequel Sans Light Head', 'Noto Sans Mono', monospace", fontWeight: 300, fontSize: '10px', letterSpacing: '0.1em', color: '#bbbbbb' }}>
        © 2024–2026 HWL. All rights reserved.
      </span>
    </div>
  )

  /* ── Mobile: single vertical column ── */
  if (isMobile) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingTop: '80px', paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <Copyright />
        <div ref={mobileRef}>

          <div style={{ marginBottom: '56px', paddingBottom: '48px', borderBottom: '1px solid rgba(15,19,25,0.20)' }}>
            <h1 style={{ fontFamily: sequel, fontSize: 'clamp(3.2rem, 16vw, 5.5rem)', fontWeight: 400, letterSpacing: '0', color: '#0f1319', lineHeight: 0.92, marginBottom: '14px' }}>
              {d.name}
            </h1>
            {d.nameKorean && (
              <p style={{ fontFamily: '"Nanum Gothic", sans-serif', fontSize: '1rem', color: '#bbbbbb', marginBottom: '32px' }}>
                {d.nameKorean}
              </p>
            )}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: d.bio ? '32px' : '0' }}>
              {d.role     && <p style={{ fontFamily: sequel, fontSize: '11px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#aaaaaa'    }}>{d.role}</p>}
              {d.location && <p style={{ fontFamily: sequel, fontSize: '11px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#c5c5c5' }}>{d.location}</p>}
            </div>
            {d.bio && (
              <p style={{ fontFamily: sequel, fontSize: '15px', fontWeight: 400, lineHeight: 1.8, color: '#999999', marginTop: '24px', marginBottom: '36px', whiteSpace: 'pre-wrap' }}>
                {d.bio}
              </p>
            )}
            <SocialButtons />
          </div>

          <div style={{ marginBottom: '56px', paddingBottom: '56px', borderBottom: '1px solid rgba(15,19,25,0.20)' }}>
            {sectionLabel('00—1', 'Education')}
            <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
              {(d.education || []).map((e, i) => (
                <div key={i} style={rowStyle}>
                  <div>
                    <span style={{ display: 'block', fontFamily: sequel, fontSize: '1.05rem', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#0f1319' }}>{e.abbr}</span>
                    <span style={{ fontFamily: sequel, fontSize: '12px', color: '#afafaf', marginTop: '5px', display: 'block' }}>{e.full}</span>
                  </div>
                  <span style={{ fontFamily: sequel, fontSize: '11px', letterSpacing: '0.06em', color: '#bbbbbb', flexShrink: 0 }}>{e.years}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '56px', paddingBottom: '56px', borderBottom: '1px solid rgba(15,19,25,0.20)' }}>
            {sectionLabel('00—2', 'Exhibition')}
            <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
              {(d.exhibitions || []).map((e, i) => (
                <div key={i} style={rowStyle}>
                  <div>
                    <span style={{ display: 'block', fontFamily: sequel, fontSize: '1.05rem', fontWeight: 400, color: '#0f1319' }}>{e.title}</span>
                    <span style={{ fontFamily: sequel, fontSize: '12px', color: '#afafaf', marginTop: '5px', display: 'block' }}>{e.event}</span>
                  </div>
                  {e.venue && <span style={{ fontFamily: sequel, fontSize: '11px', letterSpacing: '0.06em', color: '#bbbbbb', flexShrink: 0 }}>{e.venue}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            {sectionLabel('00—3', 'Experience')}
            <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
              {(d.experiences || []).map((e, i) => (
                <div key={i} style={rowStyle}>
                  <div>
                    <span style={{ display: 'block', fontFamily: sequel, fontSize: '1.05rem', fontWeight: 400, color: '#0f1319' }}>{e.role}</span>
                    <span style={{ fontFamily: sequel, fontSize: '12px', color: '#afafaf', marginTop: '5px', display: 'block' }}>{e.org}{e.sub ? ` · ${e.sub}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    )
  }

  /* ── Desktop: sticky left + scrollable right ── */
  return (
    <div style={{ backgroundColor: '#ffffff' }}>
      <Copyright />
      <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1320, margin: '0 auto' }}>

        {/* LEFT: locked identity panel */}
        <div
          ref={leftRef}
          style={{
            position:       'sticky',
            top:            0,
            width:          '38%',
            height:         '100vh',
            flexShrink:     0,
            overflow:       'hidden',
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'flex-start',
            alignItems:     'center',
            padding:        '130px 100px 0 0',
            borderRight:    '1px solid rgba(15,19,25,0.18)',
          }}
        >
          <h1 style={{
            fontFamily:          sequel,
            fontSize:            'clamp(2.8rem, 5.5vw, 5.8rem)',
            fontWeight:          400,
            letterSpacing:       '0.03em',
            color:               '#0f1319',
            lineHeight:          0.92,
            marginBottom:        '14px',
            width:               '100%',
            textRendering:       'optimizeLegibility',
            fontFeatureSettings: '"kern" 1',
          }}>
            {d.name}
          </h1>

          {d.nameKorean && (
            <p style={{ fontFamily: '"Nanum Gothic", sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#000000', marginBottom: '28px', width: '100%' }}>
              {d.nameKorean}
            </p>
          )}

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'left', marginBottom: '30px' }}>
            {d.role     && <p style={{ fontFamily: sequel, fontSize: '13px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#aaaaaa'    }}>{d.role}</p>}
            {d.location && <p style={{ fontFamily: sequel, fontSize: '13px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#c5c5c5' }}>{d.location}</p>}
          </div>

          {d.bio && (
            <p style={{ fontFamily: sequel, fontSize: 'clamp(15px, 1.4vw, 19px)', fontWeight: 400, lineHeight: 1.8, color: '#999999', maxWidth: 520, marginTop: '10px', marginBottom: '40px', whiteSpace: 'pre-wrap' }}>
              {d.bio}
            </p>
          )}

          {/* Education under name */}
          {(d.education || []).length > 0 && (
            <div style={{ marginBottom: '28px', width: '100%' }}>
              <span style={{ display: 'block', fontFamily: sequel, fontSize: '9px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#d5d5d5', marginBottom: '12px' }}>
                00—1 &nbsp; Education
              </span>
              <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
                {(d.education || []).map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(15,19,25,0.10)' }}>
                    <div>
                      <span style={{ display: 'block', fontFamily: sequel, fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#373b41' }}>
                        {e.abbr}
                      </span>
                      <span style={{ fontFamily: sequel, fontSize: '11px', color: '#c5c5c5', marginTop: '3px', display: 'block' }}>
                        {e.full}
                      </span>
                    </div>
                    <span style={{ fontFamily: sequel, fontSize: '10px', letterSpacing: '0.05em', color: '#cccccc', flexShrink: 0 }}>
                      {e.years}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SocialButtons />
        </div>

        {/* RIGHT: scrollable sections */}
        <div
          ref={rightRef}
          style={{
            flex:          1,
            paddingTop:    '130px',
            paddingBottom: '120px',
            paddingLeft:   '60px',
            paddingRight:  '64px',
          }}
        >

          <div style={{ marginBottom: '80px', paddingBottom: '80px' }}>
            {sectionLabel('00—2', 'Exhibition')}
            <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
              {(d.exhibitions || []).map((e, i) => (
                <div key={i} style={rowStyle}>
                  <div>
                    <span style={{ display: 'block', fontFamily: sequel, fontSize: 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 400, color: '#0f1319' }}>{e.title}</span>
                    <span style={{ fontFamily: sequel, fontSize: '14px', color: '#afafaf', marginTop: '5px', display: 'block' }}>{e.event}</span>
                  </div>
                  {e.venue && <span style={{ fontFamily: sequel, fontSize: '13px', letterSpacing: '0.06em', color: '#bbbbbb', flexShrink: 0 }}>{e.venue}</span>}
                </div>
              ))}
            </div>
          </div>

          <div>
            {sectionLabel('00—3', 'Experience')}
            <div style={{ borderTop: '1px solid rgba(15,19,25,0.18)' }}>
              {(d.experiences || []).map((e, i) => (
                <div key={i} style={rowStyle}>
                  <div>
                    <span style={{ display: 'block', fontFamily: sequel, fontSize: 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 400, color: '#0f1319' }}>{e.role}</span>
                    <span style={{ fontFamily: sequel, fontSize: '14px', color: '#afafaf', marginTop: '5px', display: 'block' }}>{e.org}{e.sub ? ` · ${e.sub}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
