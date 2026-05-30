import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const STAGGER = 0.035

// When `controlled` is true, the parent must be a motion element that owns
// the "initial"/"hovered" variants — Component just inherits them.
// When `controlled` is false (default), Component owns whileHover itself.
export function Component({ children, className, style, center = false, lineHeight = 1, controlled = false }) {
  const letters = children.split('')

  const inner = (
    <>
      <div>
        {letters.map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (letters.length - 1) / 2)
            : STAGGER * i
          return (
            <motion.span
              key={i}
              variants={{ initial: { y: 0 }, hovered: { y: '-100%' } }}
              transition={{ ease: 'easeInOut', delay }}
              className="inline-block"
            >
              {l}
            </motion.span>
          )
        })}
      </div>
      <div className="absolute inset-0">
        {letters.map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (letters.length - 1) / 2)
            : STAGGER * i
          return (
            <motion.span
              key={i}
              variants={{ initial: { y: '100%' }, hovered: { y: 0 } }}
              transition={{ ease: 'easeInOut', delay }}
              className="inline-block"
            >
              {l}
            </motion.span>
          )
        })}
      </div>
    </>
  )

  if (controlled) {
    return (
      <span
        className={cn('relative block overflow-hidden', className)}
        style={{ lineHeight, ...style }}
      >
        {inner}
      </span>
    )
  }

  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={cn('relative block overflow-hidden', className)}
      style={{ lineHeight }}
    >
      {inner}
    </motion.span>
  )
}
