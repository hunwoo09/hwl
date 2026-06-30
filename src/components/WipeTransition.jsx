import { useEffect, useRef } from 'react'
import { usePresence } from 'framer-motion'
import { gsap } from 'gsap'

const EASE      = 'power3.inOut'
const EXIT_DUR  = 0.45   // black slides DOWN to cover leaving page
const ENTER_DUR = 0.75   // black slides UP to reveal incoming page

const FULL      = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const COLLAPSED = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'

export default function WipeTransition({ children }) {
  const [isPresent, safeToRemove] = usePresence()
  const overlayRef = useRef(null)

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    if (isPresent) {
      // Incoming page: overlay starts full, wipes UP to reveal content
      gsap.fromTo(overlay,
        { clipPath: FULL },
        { clipPath: COLLAPSED, duration: ENTER_DUR, ease: EASE }
      )
    } else {
      // Leaving page: overlay wipes DOWN from top to cover content, then signal unmount
      gsap.fromTo(overlay,
        { clipPath: COLLAPSED },
        { clipPath: FULL, duration: EXIT_DUR, ease: EASE, onComplete: () => safeToRemove?.() }
      )
    }
  }, [isPresent, safeToRemove])

  return (
    <>
      {children}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 9500,
          pointerEvents: 'none',
          willChange: 'clip-path',
          clipPath: FULL,
        }}
      />
    </>
  )
}
