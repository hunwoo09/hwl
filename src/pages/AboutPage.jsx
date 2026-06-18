import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { Button } from '../components/ui/button'
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
  const containerRef = useRef(null)

  useEffect(() => {
    client.fetch(`*[_type == "about" && _id == "about"][0]`).then(doc => {
      if (doc) setData(doc)
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    gsap.fromTo(
      Array.from(containerRef.current.children),
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 1.0, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
    )
  }, [])

  const d = data ?? DEFAULTS

  const sectionLabel = (index, label) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '28px' }}>
      <span style={{ fontFamily: sequel, fontSize: '10px', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#333' }}>
        {index}
      </span>
      <span style={{ fontFamily: sequel, fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 1.6vw, 1.3rem)', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>
        {label}
      </span>
    </div>
  )

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '24px',
    padding: isMobile ? '16px 0' : '20px 0',
    borderBottom: '1px solid rgba(240,236,230,0.06)',
  }

  return (
    <div style={{ backgroundColor: '#000', minHeight: '100vh', paddingTop: isMobile ? '80px' : '130px', paddingBottom: '100px' }}>
      <div
        ref={containerRef}
        style={{ maxWidth: 980, margin: '0 auto', padding: isMobile ? '0 24px' : '0 64px' }}
      >

        {/* ── Hero: name + identity ── */}
        <div style={{ marginBottom: isMobile ? '56px' : '80px', paddingBottom: isMobile ? '48px' : '72px', borderBottom: '1px solid rgba(240,236,230,0.07)' }}>
          <h1 style={{
            fontFamily: sequel,
            fontSize: isMobile ? 'clamp(3.2rem, 16vw, 5.5rem)' : 'clamp(5rem, 9vw, 9.5rem)',
            fontWeight: 400,
            letterSpacing: '-0.03em',
            color: '#f0ece6',
            lineHeight: 0.92,
            marginBottom: '14px',
          }}>
            {d.name}
          </h1>

          {d.nameKorean && (
            <p style={{ fontFamily: '"Nanum Gothic", sans-serif', fontSize: isMobile ? '1rem' : '1.15rem', color: '#444', marginBottom: '32px' }}>
              {d.nameKorean}
            </p>
          )}

          <div style={{ display: 'flex', gap: isMobile ? '16px' : '32px', flexWrap: 'wrap', marginBottom: d.bio ? '32px' : '0' }}>
            {d.role && (
              <p style={{ fontFamily: sequel, fontSize: isMobile ? '11px' : '13px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#555' }}>
                {d.role}
              </p>
            )}
            {d.location && (
              <p style={{ fontFamily: sequel, fontSize: isMobile ? '11px' : '13px', letterSpacing: '0.36em', textTransform: 'uppercase', color: '#3a3a3a' }}>
                {d.location}
              </p>
            )}
          </div>

          {d.bio && (
            <p style={{
              fontFamily: sequel,
              fontSize: isMobile ? '15px' : 'clamp(15px, 1.4vw, 19px)',
              fontWeight: 400, lineHeight: 1.8, color: '#666',
              maxWidth: 600, marginTop: '24px', marginBottom: '36px',
              whiteSpace: 'pre-wrap',
            }}>
              {d.bio}
            </p>
          )}

          {(d.social?.instagram || d.social?.email || d.social?.linkedin) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: d.bio ? '0' : '32px' }}>
              {d.social?.instagram && (
                <Button variant="outline" size="icon" asChild>
                  <a href={d.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <RiInstagramLine size={16} />
                  </a>
                </Button>
              )}
              {d.social?.email && (
                <Button variant="outline" size="icon" asChild>
                  <a href={`mailto:${d.social.email}`} aria-label="Email">
                    <RiMailLine size={16} />
                  </a>
                </Button>
              )}
              {d.social?.linkedin && (
                <Button variant="outline" size="icon" asChild>
                  <a href={d.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                    <RiLinkedinLine size={16} />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Education ── */}
        <div style={{ marginBottom: isMobile ? '56px' : '80px', paddingBottom: isMobile ? '56px' : '80px', borderBottom: '1px solid rgba(240,236,230,0.07)' }}>
          {sectionLabel('00—1', 'Education')}
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.education || []).map((e, i) => (
              <div key={i} style={rowStyle}>
                <div>
                  <span style={{ display: 'block', fontFamily: sequel, fontSize: isMobile ? '1.05rem' : 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 400, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f0ece6' }}>
                    {e.abbr}
                  </span>
                  <span style={{ fontFamily: sequel, fontSize: isMobile ? '12px' : '14px', color: '#505050', marginTop: '5px', display: 'block' }}>
                    {e.full}
                  </span>
                </div>
                <span style={{ fontFamily: sequel, fontSize: isMobile ? '11px' : '13px', letterSpacing: '0.06em', color: '#444', flexShrink: 0 }}>
                  {e.years}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Exhibition ── */}
        <div style={{ marginBottom: isMobile ? '56px' : '80px', paddingBottom: isMobile ? '56px' : '80px', borderBottom: '1px solid rgba(240,236,230,0.07)' }}>
          {sectionLabel('00—2', 'Exhibition')}
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.exhibitions || []).map((e, i) => (
              <div key={i} style={rowStyle}>
                <div>
                  <span style={{ display: 'block', fontFamily: sequel, fontSize: isMobile ? '1.05rem' : 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 400, color: '#f0ece6' }}>
                    {e.title}
                  </span>
                  <span style={{ fontFamily: sequel, fontSize: isMobile ? '12px' : '14px', color: '#505050', marginTop: '5px', display: 'block' }}>
                    {e.event}
                  </span>
                </div>
                {e.venue && (
                  <span style={{ fontFamily: sequel, fontSize: isMobile ? '11px' : '13px', letterSpacing: '0.06em', color: '#444', flexShrink: 0 }}>
                    {e.venue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Experience ── */}
        <div>
          {sectionLabel('00—3', 'Experience')}
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.experiences || []).map((e, i) => (
              <div key={i} style={rowStyle}>
                <div>
                  <span style={{ display: 'block', fontFamily: sequel, fontSize: isMobile ? '1.05rem' : 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 400, color: '#f0ece6' }}>
                    {e.role}
                  </span>
                  <span style={{ fontFamily: sequel, fontSize: isMobile ? '12px' : '14px', color: '#505050', marginTop: '5px', display: 'block' }}>
                    {e.org}{e.sub ? ` · ${e.sub}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
