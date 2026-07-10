import { useEffect } from 'react'
import Lenis from 'lenis'

// Desktop: smooths wheel scroll. Mobile: syncTouch smooths touch scroll the
// same way — pages that need native behavior (scroll-snap, nested panels)
// opt out with data-lenis-prevent on their scroll container.
export function useSmoothScroll(isMobile = false) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: isMobile ? 1.1 : 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      allowNestedScroll: true,
      ...(isMobile ? { syncTouch: true, syncTouchLerp: 0.08 } : {}),
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
