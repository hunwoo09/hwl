import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { transitionState } from '../transitionState'

const variants = {
  initial: () => {
    const ret = transitionState.returnedFromList
    return {
      opacity: ret ? 1   : 0,
      y:       ret ? '-100vh' : 60,
    }
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
  exit: () => {
    const fl = transitionState.fromList
    return {
      opacity: fl ? 1    : 0,
      y:       fl ? '-100vh' : -30,
      transition: {
        duration: fl ? 0.65 : 0.38,
        ease:     fl ? [0.4, 0, 0.2, 1] : [0.4, 0, 1, 1],
      },
    }
  },
}

export default function PageTransition({ children }) {
  const motionRef = useRef(null)
  const isListReturn = useRef(transitionState.returnedFromList).current

  return (
    <motion.div
      ref={motionRef}
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
