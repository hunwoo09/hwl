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

// Half-sizes precomputed — avoids calc() inside transform on every frame
const DOT_R  = 2.5   // half of #cursor  5px
const RING_R = 14    // half of #cursor-ring 28px

function moveDot(x, y) {
  cursor.style.transform = `translate3d(${x - DOT_R}px,${y - DOT_R}px,0)`
}
function moveRing(x, y) {
  ring.style.transform = `translate3d(${x - RING_R}px,${y - RING_R}px,0)`
}

function showCursor() {
  cursor.style.opacity = '1'
  ring.style.opacity   = '1'
}
function hideCursor() {
  cursor.style.opacity = '0'
  ring.style.opacity   = '0'
}

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX
  mouseY = e.clientY
  moveDot(mouseX, mouseY)
  showCursor()
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hideCursor, 2500)
})

document.addEventListener('mouseleave', () => {
  // Snap ring to dot so it doesn't trail in from a stale spot on re-entry
  ringX = mouseX
  ringY = mouseY
  hideCursor()
})

document.addEventListener('mouseenter', (e) => {
  // Teleport both to actual position before revealing — no catch-up lag
  mouseX = e.clientX
  mouseY = e.clientY
  ringX  = mouseX
  ringY  = mouseY
  moveDot(mouseX, mouseY)
  moveRing(ringX, ringY)
  showCursor()
  clearTimeout(hideTimer)
  hideTimer = setTimeout(hideCursor, 2500)
})

function animateRing() {
  ringX += (mouseX - ringX) * 0.12
  ringY += (mouseY - ringY) * 0.12
  moveRing(ringX, ringY)
  requestAnimationFrame(animateRing)
}
animateRing()

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)