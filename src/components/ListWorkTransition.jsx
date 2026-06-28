import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { transitionState } from '../transitionState'

// Same duration + ease as PageTransition's fromList exit so both panels
// move in perfect lockstep — creating a continuous vertical scroll feel.
const DURATION = 0.65
const EASE     = [0.4, 0, 0.2, 1]

export default function ListWorkTransition({ children }) {
  const location = useLocation()
  const fromList = location.state?.fromList ?? false

  if (!fromList) return children

  return (
    <motion.div
      initial={{ y: '100vh' }}
      animate={{ y: 0, transition: { duration: DURATION, ease: EASE } }}
      exit={{
        y: '100vh',
        transition: { duration: DURATION, ease: EASE },
        // Signal Hero's PageTransition to slide back down
        onComplete: () => { transitionState.returnedFromList = false },
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 1, background: '#000' }}
    >
      {children}
    </motion.div>
  )
}
