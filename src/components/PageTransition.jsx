import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { transitionState } from '../transitionState'

// Variant functions are resolved lazily by Framer Motion when the animation
// actually starts — so transitionState flags set just before navigate() are
// already current when these run.
const variants = {
  initial: () => {
    const ret = transitionState.returnedFromList
    return {
      opacity:  ret ? 1    : 0,
      y:        ret ? '-100vh' : '6vh',
      rotateX:  ret ? 0    : 9,
      scale:    ret ? 1    : 0.97,
    }
  },
  animate: {
    opacity: 1, y: 0, rotateX: 0, scale: 1,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
  exit: () => {
    const fl = transitionState.fromList
    return {
      opacity:    fl ? 1       : 0,
      y:          fl ? '-100vh': '-2vh',
      scale:      fl ? 1       : 0.96,
      ...(fl ? {} : { filter: 'blur(5px)' }),
      transition: {
        duration: fl ? 0.65 : 0.32,
        ease:     fl ? [0.4, 0, 0.2, 1] : [0.55, 0, 1, 0.45],
      },
    }
  },
}

export default function PageTransition({ children }) {
  const [idle, setIdle] = useState(false)
  const motionRef = useRef(null)
  // Capture at mount time to suppress perspective during list-return entry
  const isListReturn = useRef(transitionState.returnedFromList).current

  return (
    <div style={{
      perspective:       (idle || isListReturn) ? undefined : '1100px',
      perspectiveOrigin: '50% 0%',
    }}>
      <motion.div
        ref={motionRef}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          transformOrigin: '50% 0%',
          willChange:      idle ? 'auto' : 'transform, opacity',
        }}
        onAnimationStart={(def) => {
          if (def === 'exit') {
            setIdle(false)
            // Flag already consumed by exit(); clear it after this tick
            requestAnimationFrame(() => { transitionState.fromList = false })
          }
        }}
        onAnimationComplete={(def) => {
          if (def === 'animate') {
            setIdle(true)
            transitionState.returnedFromList = false
            if (motionRef.current) motionRef.current.style.transform = 'none'
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
