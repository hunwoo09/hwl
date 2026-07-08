// Tiny pub/sub so AboutPage can fade its social buttons out the moment
// navigation leaves /about, even though — during the App-level crossfade —
// AboutPage's own useLocation() stays frozen on '/about' for the whole
// fade-out window (it's rendered via <Routes location={displayLoc}>, which
// intentionally overrides context for descendants so the old route keeps
// rendering while it fades). App.jsx emits on the real location change.
const listeners = new Set()

export const aboutExitState = {
  subscribeLeaving(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  emitLeaving() {
    listeners.forEach(fn => fn())
  },
}
