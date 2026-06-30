import { motion } from 'framer-motion'

// hop2 ≈ cubic-bezier(0.9, 0, 0.1, 1) from the Codegrid reference
const EASE = [0.9, 0, 0.1, 1]

const overlayVariants = {
  initial: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
  animate: {
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
    transition: { duration: 0.9, ease: EASE },
  },
  exit: {
    clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    transition: { duration: 0, ease: 'linear' },
  },
}

const wrapVariants = {
  initial: {},
  animate: {},
  exit: { transition: { duration: 0 } },
}

export default function WipeTransition({ children }) {
  return (
    <motion.div variants={wrapVariants} initial="initial" animate="animate" exit="exit">
      {children}
      <motion.div
        variants={overlayVariants}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000000',
          zIndex: 9500,
          pointerEvents: 'none',
          willChange: 'clip-path',
        }}
      />
    </motion.div>
  )
}
