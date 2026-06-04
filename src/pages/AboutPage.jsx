import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { client } from '../sanityClient'
import { Button } from '../components/ui/button'
import { RiInstagramLine, RiMailLine, RiLinkedinLine } from '@remixicon/react'
import { useIsMobile } from '../hooks/useIsMobile'

const mono = '"Noto Sans Mono", monospace'

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

function SectionHeader({ index, label }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <span style={{ display: 'block', fontFamily: mono, fontSize: '10px', letterSpacing: '0.38em', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>
        {index}
      </span>
      <span style={{ display: 'block', fontFamily: mono, fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#666' }}>
        {label}
      </span>
    </div>
  )
}


function Row({ primary, secondary, tertiary }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'baseline', gap: '24px',
      padding: '14px 0',
      borderBottom: '1px solid rgba(240,236,230,0.06)',
    }}>
      <div>
        <span style={{ fontFamily: mono, fontSize: '11px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f0ece6' }}>
          {primary}
        </span>
        {secondary && (
          <span style={{ display: 'block', fontFamily: mono, fontSize: '10px', color: '#555', marginTop: '3px', fontWeight: 300 }}>
            {secondary}
          </span>
        )}
      </div>
      {tertiary && (
        <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.1em', color: '#555', flexShrink: 0 }}>
          {tertiary}
        </span>
      )}
    </div>
  )
}

function Separator() {
  return (
    <div style={{
      position: 'absolute', right: 0, top: '8%', bottom: '8%', width: 1,
      background: 'linear-gradient(to bottom, transparent, rgba(240,236,230,0.1) 25%, rgba(240,236,230,0.1) 75%, transparent)',
      pointerEvents: 'none',
    }} />
  )
}

function AboutPageDesktop() {
  const [data, setData]   = useState(null)
  const scrollRef         = useRef(null)
  const innerRef          = useRef(null)

  useEffect(() => {
    client.fetch(`*[_type == "about" && _id == "about"][0]`).then(doc => {
      if (doc) setData(doc)
    })
  }, [])

  const d = data ?? DEFAULTS

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    if (!innerRef.current) return
    gsap.fromTo(
      Array.from(innerRef.current.children),
      { opacity: 0, x: 28 },
      { opacity: 1, x: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
    )
  }, [])

  const panel = (width) => ({
    flexShrink: 0, height: '100%', width,
    display: 'flex', flexDirection: 'column',
    padding: '120px 48px 44px',
    position: 'relative',
  })

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar"
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#000000',
        overflowX: 'auto', overflowY: 'hidden',
        display: 'flex',
      }}
    >
      <div ref={innerRef} style={{ display: 'flex', height: '100%', margin: '0 auto' }}>

        {/* ── Panel 1: Identity ── */}
        <div style={panel(460)}>
          <Separator />
          <SectionHeader index="00—1" label="Identity" />
          <div>
            <h1 style={{ fontFamily: mono, fontSize: 'clamp(1.6rem, 2.8vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0ece6', lineHeight: 1.1, marginBottom: '4px' }}>
              {d.name}
            </h1>
            {d.nameKorean && (
              <p style={{ fontFamily: '"Nanum Gothic", sans-serif', fontSize: '0.85rem', color: '#555', marginBottom: '24px' }}>
                {d.nameKorean}
              </p>
            )}
            {d.role && (
              <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>
                {d.role}
              </p>
            )}
            {d.location && (
              <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#444', marginBottom: d.bio ? '20px' : '32px' }}>
                {d.location}
              </p>
            )}
            {d.bio && (
              <p style={{ fontFamily: mono, fontSize: '11px', fontWeight: 300, lineHeight: 1.85, color: '#555', marginBottom: '32px', whiteSpace: 'pre-wrap' }}>
                {d.bio}
              </p>
            )}
            {(d.social?.instagram || d.social?.email || d.social?.linkedin) && (
              <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>

        {/* ── Panel 2: Education ── */}
        <div style={panel(520)}>
          <Separator />
          <SectionHeader index="00—2" label="Education" />
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.education || []).map((e, i) => (
              <Row key={i} primary={e.abbr} secondary={e.full} tertiary={e.years} />
            ))}
          </div>
        </div>

        {/* ── Panel 3: Exhibition ── */}
        <div style={panel(560)}>
          <Separator />
          <SectionHeader index="00—3" label="Exhibition" />
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.exhibitions || []).map((e, i) => (
              <Row key={i} primary={e.title} secondary={e.event} tertiary={e.venue || null} />
            ))}
          </div>
        </div>

        {/* ── Panel 4: Experience ── */}
        <div style={panel(480)}>
          <Separator />
          <SectionHeader index="00—4" label="Experience" />
          <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
            {(d.experiences || []).map((e, i) => (
              <Row key={i} primary={e.role} secondary={e.org + (e.sub ? ' · ' + e.sub : '')} tertiary={null} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Mobile: vertical stack ─────────────────────────────────────────────────────

function AboutPageMobile() {
  const [data, setData] = useState(null)

  useEffect(() => {
    client.fetch(`*[_type == "about" && _id == "about"][0]`).then(doc => {
      if (doc) setData(doc)
    })
  }, [])

  const d = data ?? DEFAULTS

  const section = { padding: '40px 24px', borderBottom: '1px solid rgba(240,236,230,0.07)' }

  return (
    <div style={{ backgroundColor: '#000000', minHeight: '100vh', paddingTop: '72px' }}>

      {/* Identity */}
      <div style={section}>
        <SectionHeader index="00—1" label="Identity" />
        <h1 style={{ fontFamily: mono, fontSize: 'clamp(1.8rem, 8vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0ece6', lineHeight: 1.1, marginBottom: '4px' }}>
          {d.name}
        </h1>
        {d.nameKorean && (
          <p style={{ fontFamily: '"Nanum Gothic", sans-serif', fontSize: '0.85rem', color: '#555', marginBottom: '20px' }}>
            {d.nameKorean}
          </p>
        )}
        {d.role && (
          <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#555', marginBottom: '6px' }}>
            {d.role}
          </p>
        )}
        {d.location && (
          <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', color: '#444', marginBottom: d.bio ? '20px' : '28px' }}>
            {d.location}
          </p>
        )}
        {d.bio && (
          <p style={{ fontFamily: mono, fontSize: '11px', fontWeight: 300, lineHeight: 1.85, color: '#555', marginBottom: '28px', whiteSpace: 'pre-wrap' }}>
            {d.bio}
          </p>
        )}
        {(d.social?.instagram || d.social?.email || d.social?.linkedin) && (
          <div style={{ display: 'flex', gap: '8px' }}>
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

      {/* Education */}
      <div style={section}>
        <SectionHeader index="00—2" label="Education" />
        <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
          {(d.education || []).map((e, i) => (
            <Row key={i} primary={e.abbr} secondary={e.full} tertiary={e.years} />
          ))}
        </div>
      </div>

      {/* Exhibition */}
      <div style={section}>
        <SectionHeader index="00—3" label="Exhibition" />
        <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
          {(d.exhibitions || []).map((e, i) => (
            <Row key={i} primary={e.title} secondary={e.event} tertiary={e.venue || null} />
          ))}
        </div>
      </div>

      {/* Experience */}
      <div style={{ ...section, borderBottom: 'none' }}>
        <SectionHeader index="00—4" label="Experience" />
        <div style={{ borderTop: '1px solid rgba(240,236,230,0.06)' }}>
          {(d.experiences || []).map((e, i) => (
            <Row key={i} primary={e.role} secondary={e.org + (e.sub ? ' · ' + e.sub : '')} tertiary={null} />
          ))}
        </div>
      </div>

    </div>
  )
}

// ── Export: pick based on screen size ─────────────────────────────────────────
export default function AboutPage() {
  const isMobile = useIsMobile()
  return isMobile ? <AboutPageMobile /> : <AboutPageDesktop />
}
