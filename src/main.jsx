import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const cursor = document.createElement('div')
cursor.id = 'cursor'
document.body.appendChild(cursor)

const ring = document.createElement('div')
ring.id = 'cursor-ring'
document.body.appendChild(ring)

let ringX = 0, ringY = 0
let mouseX = 0, mouseY = 0
let hideTimer = null

function showCursor() {
  cursor.style.opacity = '1'
  ring.style.opacity = '1'
}

function hideCursor() {
  cursor.style.opacity = '0'
  ring.style.opacity = '0'
}

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX
  mouseY = e.clientY
  cursor.style.left = mouseX + 'px'
  cursor.style.top = mouseY + 'px'
  showCursor()
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hideCursor, 2500)
})

document.addEventListener('mouseleave', hideCursor)

function animateRing() {
  ringX += (mouseX - ringX) * 0.12
  ringY += (mouseY - ringY) * 0.12
  ring.style.left = ringX + 'px'
  ring.style.top = ringY + 'px'
  requestAnimationFrame(animateRing)
}
animateRing()

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)