import { motion } from 'framer-motion'

export default function FadeTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.85, delay: 0.18, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.22, ease: 'linear' } }}
    >
      {children}
    </motion.div>
  )
}
