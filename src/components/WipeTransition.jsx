import { useEffect, useRef } from 'react'
import { usePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { transitionState } from '../transitionState'

const EXIT_EASE  = 'power4.in'   // slow breath → slams down
const ENTER_EASE = 'expo.out'    // whooshes up → gracefully settles
const EXIT_DUR   = 0.8
const ENTER_DUR  = 1.35

const FULL      = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const COLLAPSED = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'

export default function WipeTransition({ children }) {
  const [isPresent, safeToRemove] = usePresence()
  const overlayRef = useRef(null)

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return
    if (isPresent) {
      transitionState.navbarHandledExit = false
      gsap.fromTo(overlay,
        { clipPath: FULL },
        { clipPath: COLLAPSED, duration: ENTER_DUR, ease: ENTER_EASE, delay: 0.5 }
      )
    } else {
      if (transitionState.navbarHandledExit) {
        // Navbar already covered the screen — skip exit animation, unmount immediately
        safeToRemove?.()
      } else {
        gsap.fromTo(overlay,
          { clipPath: COLLAPSED },
          { clipPath: FULL, duration: EXIT_DUR, ease: EXIT_EASE, onComplete: () => safeToRemove?.() }
        )
      }
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
