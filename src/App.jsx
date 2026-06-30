import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import WipeTransition from './components/WipeTransition'
import JpgPage from './pages/JpgPage'
import Mp4Page from './pages/Mp4Page'
import ObjPage from './pages/ObjPage'
import ArchivePage from './pages/ArchivePage'
import WorkPage from './pages/WorkPage'
import WorksPage from './pages/WorksPage'
import AboutPage from './pages/AboutPage'

function RotateLock() {
  return (
    <div style={{
      display: 'none',
      position: 'fixed', inset: 0, zIndex: 99999,
      backgroundColor: '#000000',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
    }}
      className="rotate-lock"
    >
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,230,0.4)" strokeWidth="1.5">
        <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
      </svg>
      <p style={{
        fontFamily: '"Noto Sans Mono", monospace',
        fontSize: '10px', letterSpacing: '0.35em',
        textTransform: 'uppercase', color: 'rgba(240,236,230,0.35)',
      }}>
        rotate to portrait
      </p>
    </div>
  )
}

function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div
      style={isHome ? { backgroundColor: '#000000', height: '100vh', overflow: 'hidden' } : { backgroundColor: '#000000' }}
    >
      <RotateLock />
      <Navbar />


      <AnimatePresence mode="sync" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/"        element={<WipeTransition><Hero /></WipeTransition>} />
          <Route path="/jpg"     element={<WipeTransition><JpgPage /></WipeTransition>} />
          <Route path="/mp4"     element={<WipeTransition><Mp4Page /></WipeTransition>} />
          <Route path="/obj"     element={<WipeTransition><ObjPage /></WipeTransition>} />
          <Route path="/works"   element={<WipeTransition><WorksPage /></WipeTransition>} />
          <Route path="/archive" element={<WipeTransition><ArchivePage /></WipeTransition>} />
          <Route path="/work/:id" element={<WipeTransition><WorkPage /></WipeTransition>} />
          <Route path="/about"   element={<WipeTransition><AboutPage /></WipeTransition>} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
