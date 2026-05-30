import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import PageTransition from './components/PageTransition'
import FadeTransition from './components/FadeTransition'
import JpgPage from './pages/JpgPage'
import Mp4Page from './pages/Mp4Page'
import ObjPage from './pages/ObjPage'
import ArchivePage from './pages/ArchivePage'
import WorkPage from './pages/WorkPage'
import WorksPage from './pages/WorksPage'
import AboutPage from './pages/AboutPage'

function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div
      style={isHome ? { backgroundColor: '#000000', height: '100vh', overflow: 'hidden' } : { backgroundColor: '#000000' }}
    >
      <Navbar />


      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/"        element={<PageTransition><Hero /></PageTransition>} />
          <Route path="/jpg"     element={<PageTransition><JpgPage /></PageTransition>} />
          <Route path="/mp4"     element={<PageTransition><Mp4Page /></PageTransition>} />
          <Route path="/obj"     element={<PageTransition><ObjPage /></PageTransition>} />
          <Route path="/works"   element={<FadeTransition><WorksPage /></FadeTransition>} />
          <Route path="/archive" element={<PageTransition><ArchivePage /></PageTransition>} />
          <Route path="/work/:id" element={<FadeTransition><WorkPage /></FadeTransition>} />
          <Route path="/about"   element={<FadeTransition><AboutPage /></FadeTransition>} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
