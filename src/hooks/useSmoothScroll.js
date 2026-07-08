import { useEffect } from 'react'
import Lenis from 'lenis'

// enabled=false skips Lenis entirely (mobile: native touch scroll already
// smooth, and the permanent RAF loop just burns battery there).
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      allowNestedScroll: true,
    })
    let rafId
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [enabled])
}
