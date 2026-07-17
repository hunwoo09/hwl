import { useEffect } from 'react'
import Lenis from 'lenis'

// Desktop only: smooths wheel scroll. Mobile keeps native touch scrolling —
// no Lenis instance at all. Pages that need native behavior (scroll-snap,
// nested panels) opt out with data-lenis-prevent on their scroll container.
export function useSmoothScroll(isMobile = false) {
  useEffect(() => {
    if (isMobile) return
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
  }, [isMobile])
}
