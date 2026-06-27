import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useIsMobile } from '../hooks/useIsMobile'

const LEFT_W = 420
const mono   = '"Noto Sans Mono", monospace'

function imageUrl(ref) {
  return `https://cdn.sanity.io/images/18oh8tdj/production/${ref
    .replace('image-', '').replace(/-(\w+)$/, '.$1')}`
}

function fileUrl(ref) {
  return `https://cdn.sanity.io/files/18oh8tdj/production/${ref
    .replace('file-', '').replace(/-(\w+)$/, '.$1')}`
}

export default function WorkOverlay({ project, imageRef, clickedRect, onClose, galleryEl }) {
  const leftRef = useRef(null)
  const imgRef  = useRef(null)
  const isMobile = useIsMobile()

  // ── Open animation ──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    const mob = vw < 768
    const tl  = gsap.timeline()

    // 1. Kill pointer-events on gallery so nothing can be mis-clicked
    if (galleryEl) {
      galleryEl.style.pointerEvents = 'none'
      tl.to(galleryEl, { opacity: 0, duration: 0.25, ease: 'power2.out' }, 0)
    }

    // 2. Flying image: clicked rect → right panel
    if (imgRef.current) {
      if (!mob && clickedRect) {
        gsap.set(imgRef.current, {
          left:   clickedRect.left,
          top:    clickedRect.top,
          width:  clickedRect.width,
          height: clickedRect.height,
          opacity: 1,
        })
        tl.to(imgRef.current, {
          left:   LEFT_W,
          top:    0,
          width:  vw - LEFT_W,
          height: vh,
          duration: 0.55,
          ease: 'power3.inOut',
        }, 0)
      } else {
        // Mobile: image fills screen, fades in
        gsap.set(imgRef.current, { left: 0, top: 0, width: vw, height: vh, opacity: 0 })
        tl.to(imgRef.current, { opacity: 1, duration: 0.3 }, 0)
      }
    }

    // 3. Left panel slides in from the left
    if (leftRef.current) {
      if (!mob) {
        gsap.set(leftRef.current, { x: -LEFT_W, opacity: 0 })
        tl.to(leftRef.current, { x: 0, opacity: 1, duration: 0.52, ease: 'power3.out' }, 0.1)
      } else {
        gsap.set(leftRef.current, { y: 48, opacity: 0 })
        tl.to(leftRef.current, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' }, 0.28)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close animation ─────────────────────────────────────────────────────────
  function handleClose() {
    const vw  = window.innerWidth
    const mob = vw < 768
    const tl  = gsap.timeline({ onComplete: onClose })

    // Left panel out
    if (leftRef.current) {
      if (!mob) {
        tl.to(leftRef.current, { x: -LEFT_W, opacity: 0, duration: 0.32, ease: 'power2.in' }, 0)
      } else {
        tl.to(leftRef.current, { y: 40, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
      }
    }

    // Image shrinks back to where it was clicked
    if (imgRef.current) {
      if (!mob && clickedRect) {
        tl.to(imgRef.current, {
          left:   clickedRect.left,
          top:    clickedRect.top,
          width:  clickedRect.width,
          height: clickedRect.height,
          duration: 0.48,
          ease: 'power3.inOut',
        }, 0)
      } else {
        tl.to(imgRef.current, { opacity: 0, duration: 0.28 }, 0)
      }
    }

    // Gallery fades back in, pointer-events restored
    if (galleryEl) {
      tl.to(galleryEl, { opacity: 1, duration: 0.35, ease: 'power2.out' }, 0.22)
      tl.call(() => { galleryEl.style.pointerEvents = '' }, [], 0.22)
    }
  }

  const meta = [project?.year, project?.medium, project?.location].filter(Boolean)

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      zIndex:        1000,
      backgroundColor: '#000000',
      pointerEvents: 'all',
    }}>

      {/* ── Left info panel ─────────────────────────────────────────────── */}
      <div
        ref={leftRef}
        style={{
          position:    'absolute',
          left: 0, top: 0,
          width:       isMobile ? '100%' : LEFT_W,
          height:      '100vh',
          borderRight: isMobile ? 'none' : '1px solid #222',
          display:     'flex',
          flexDirection: 'column',
          padding:     isMobile ? '120px 24px 40px' : '130px 32px 48px',
          overflowY:   'auto',
          zIndex:      2,
          boxSizing:   'border-box',
        }}
      >
        {/* Back button */}
        <button
          onClick={handleClose}
          style={{
            fontFamily:     mono,
            fontSize:       '10px',
            letterSpacing:  '0.35em',
            textTransform:  'uppercase',
            color:          '#444',
            background:     'none',
            border:         'none',
            padding:        0,
            cursor:         'pointer',
            textAlign:      'left',
            marginBottom:   40,
            transition:     'color 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0ece6' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444' }}
        >
          ← back
        </button>

        {/* Title */}
        <h1 style={{
          fontFamily:    mono,
          fontWeight:    300,
          fontStyle:     'italic',
          fontSize:      'clamp(2rem, 3vw, 3rem)',
          lineHeight:    0.95,
          letterSpacing: '-0.02em',
          color:         '#f0ece6',
          marginBottom:  20,
        }}>
          {project?.title}
        </h1>

        {/* Meta: year / medium / location */}
        {meta.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 32 }}>
            {meta.map((m, i) => (
              <span key={i} style={{
                fontFamily:    mono,
                fontSize:      '10px',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color:         '#444',
              }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {project?.description && (
          <p style={{
            fontFamily:  mono,
            fontSize:    '13px',
            fontWeight:  300,
            lineHeight:  1.75,
            color:       '#666',
            whiteSpace:  'pre-wrap',
            wordBreak:   'break-word',
          }}>
            {project.description}
          </p>
        )}

        {/* Downloadable files */}
        {project?.codeFiles?.length > 0 && (
          <div style={{ marginTop: 'auto', paddingTop: 32 }}>
            <p style={{
              fontFamily:    mono,
              fontSize:      '9px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              color:         '#333',
              marginBottom:  8,
            }}>
              Files
            </p>
            {project.codeFiles.map((f, i) =>
              f?.asset?._ref ? (
                <a
                  key={i}
                  href={fileUrl(f.asset._ref)}
                  download target="_blank" rel="noopener noreferrer"
                  style={{
                    fontFamily:    mono,
                    fontSize:      '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color:         '#555',
                    textDecoration: 'none',
                    display:       'flex',
                    alignItems:    'center',
                    gap:           8,
                    marginTop:     8,
                  }}
                >
                  <span style={{ color: '#333' }}>↓</span>
                  {f.label || `File ${i + 1}`}
                </a>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* ── Flying / right-panel image ───────────────────────────────────── */}
      {imageRef && (
        <img
          ref={imgRef}
          src={imageUrl(imageRef)}
          alt={project?.title ?? ''}
          draggable={false}
          style={{
            position:     'fixed',
            objectFit:    'cover',
            display:      'block',
            userSelect:   'none',
            pointerEvents: 'none',
            zIndex:       1,
          }}
        />
      )}
    </div>
  )
}
