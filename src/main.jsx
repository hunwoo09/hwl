import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Warm the HeroCanvas + three.js chunks immediately on landing-page loads,
// so they download in parallel with React's first render instead of waiting
// for Hero to mount and hit its lazy() boundary. Vite dedupes this with the
// lazy(() => import(...)) inside Hero, so the chunk is only fetched once.
if (window.location.pathname === '/') {
  import('./components/HeroCanvas.jsx')
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
