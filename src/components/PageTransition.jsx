import { motion } from 'framer-motion'
import { useRef } from 'react'
import { transitionState } from '../transitionState'

// initial + exit use functions so transitionState is read lazily at animation time.
// animate uses the `custom` prop (isListReturn captured at mount) to skip the
// flash-cut delay when returning from the list view.
const variants = {
  initial: () => {
    const ret = transitionState.returnedFromList
    return {
      opacity: ret ? 1 : 0,
      y:       ret ? '-100vh' : 0,
    }
  },
  animate: (isListReturn) => ({
    opacity: 1,
    y:       0,
    transition: {
      duration: 0.85,
      delay:    isListReturn ? 0 : 0.18,
      ease:     [0.16, 1, 0.3, 1],
    },
  }),
  exit: () => {
    const fl = transitionState.fromList
    return {
      opacity: fl ? 1 : 0,
      y:       fl ? '-100vh' : 0,
      transition: {
        duration: fl ? 0.9 : 0.22,
        ease:     fl ? [0.4, 0, 0.2, 1] : 'linear',
      },
    }
  },
}

export default function PageTransition({ children }) {
  const motionRef    = useRef(null)
  // Read once at mount — used to skip the delay when sliding back from list view
  const isListReturn = useRef(transitionState.returnedFromList).current

  return (
    <motion.div
      ref={motionRef}
      custom={isListReturn}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      onAnimationStart={(def) => {
        if (def === 'exit')
          requestAnimationFrame(() => { transitionState.fromList = false })
      }}
      onAnimationComplete={(def) => {
        if (def === 'animate') {
          transitionState.returnedFromList = false
          if (motionRef.current) motionRef.current.style.transform = 'none'
        }
      }}
    >
      {children}
    </motion.div>
  )
}
