import { motion } from 'framer-motion'
import { useRef, useState } from 'react'

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
  const [idle, setIdle] = useState(false)
  const motionRef = useRef(null)

  return (
    // perspective + any transform on an ancestor traps position:fixed children
    // (Safari bug / CSS spec). Remove both once the entry animation is done.
    <div style={{
      perspective: idle ? undefined : '1100px',
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
          willChange: idle ? 'auto' : 'transform, opacity',
        }}
        onAnimationComplete={(def) => {
          if (def === 'animate') {
            setIdle(true)
            // Even an identity 3D matrix keeps a containing block on Safari.
            // Setting transform:none directly frees position:fixed descendants.
            if (motionRef.current) motionRef.current.style.transform = 'none'
          }
        }}
        onAnimationStart={(def) => {
          if (def === 'exit') setIdle(false)
          // framer-motion re-applies its transform on the first exit frame,
          // overriding the 'none' we set — exit animation still works correctly.
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
