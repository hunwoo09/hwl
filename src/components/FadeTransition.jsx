import { motion } from 'framer-motion'

export default function FadeTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -30, transition: { duration: 0.38, ease: [0.4, 0, 1, 1] } }}
    >
      {children}
    </motion.div>
  )
}
