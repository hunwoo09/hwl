import { motion } from 'framer-motion'
import { useState } from 'react'

const variants = {
  initial: {
    opacity: 0,
    y: '6vh',
    rotateX: 9,
    scale: 0.97,
  },
  animate: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: '-2vh',
    scale: 0.96,
    filter: 'blur(5px)',
    transition: {
      duration: 0.32,
      ease: [0.55, 0, 1, 0.45],
    },
  },
}

export default function PageTransition({ children }) {
  // will-change:transform creates a new stacking context that breaks
  // position:sticky and scroll containers inside the page.
  // Clear it once the entry animation finishes; restore it for exit.
  const [idle, setIdle] = useState(false)

  return (
    <div style={{ perspective: '1100px', perspectiveOrigin: '50% 0%' }}>
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          transformOrigin: '50% 0%',
          willChange: idle ? 'auto' : 'transform, opacity',
        }}
        onAnimationComplete={(def) => { if (def === 'animate') setIdle(true) }}
        onAnimationStart={(def)    => { if (def === 'exit')    setIdle(false) }}
      >
        {children}
      </motion.div>
    </div>
  )
}
