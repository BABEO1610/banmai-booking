import { useEffect, useRef, useState } from 'react'
import './studio-pet.css'
import PixelPet from './PixelPet.jsx'

const lines = ['THẾ GIỚI!!!', 'Mạnh, vua chụp nắng', 'Một, hai, ba... cười nào!', 'Xin chào! 📸', 'Click vào mình đi~']
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function StudioPet() {
  const [visible,    setVisible]    = useState(() => sessionStorage.getItem('banmai-pet-hidden') !== '1')
  const [line,       setLine]       = useState('')
  const [manualLine, setManualLine] = useState(false)
  const [dragging,   setDragging]   = useState(false)
  const [shooting,   setShooting]   = useState(false)
  const [walking,    setWalking]    = useState(false)

  const stage      = useRef(null)
  const position   = useRef({ x: 18, lift: 0, direction: 1, dragging: false })
  const dragStart  = useRef(null)
  const nextLine   = useRef(0)
  const lineTimer  = useRef(null)
  const shootTimer = useRef(null)
  const prevX      = useRef(18)

  /* ── speech lines ─────────────────────────────────────────────── */
  const speak = () => {
    clearTimeout(lineTimer.current)
    // trigger shoot animation
    clearTimeout(shootTimer.current)
    setShooting(true)
    shootTimer.current = setTimeout(() => setShooting(false), 250)

    setLine(lines[nextLine.current % lines.length])
    setManualLine(true)
    nextLine.current += 1
    lineTimer.current = setTimeout(() => setLine(''), 4300)
  }

  /* ── periodic speech ──────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) return undefined
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return undefined
    const interval = setInterval(() => {
      if (document.hidden || position.current.dragging) return
      setLine(lines[nextLine.current % lines.length])
      setManualLine(false)
      nextLine.current += 1
      clearTimeout(lineTimer.current)
      lineTimer.current = setTimeout(() => setLine(''), 3600)
    }, 18000)
    return () => { clearInterval(interval); clearTimeout(lineTimer.current) }
  }, [visible])

  /* ── rAF movement loop ────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) return undefined
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame
    let previous = performance.now()
    const move = (time) => {
      const elapsed = Math.min(time - previous, 64)
      previous = time
      const cur = position.current
      const maxX = Math.max(12, window.innerWidth - (stage.current?.offsetWidth || 84) - 18)
      if (!cur.dragging) {
        cur.lift = Math.max(0, cur.lift - elapsed * 0.6)
        if (!reduced.matches && !document.hidden && cur.lift === 0) {
          cur.x += cur.direction * elapsed * 0.018
          if (cur.x >= maxX) { cur.x = maxX; cur.direction = -1 }
          if (cur.x <= 12)   { cur.x = 12;   cur.direction =  1 }
        }
      }
      cur.x = clamp(cur.x, 12, maxX)
      if (stage.current) stage.current.style.transform = `translate3d(${cur.x}px, ${-cur.lift}px, 0)`

      // detect walking (significant horizontal movement)
      const dx = Math.abs(cur.x - prevX.current)
      if (dx > 0.04) setWalking(true)
      else setWalking(false)
      prevX.current = cur.x

      frame = requestAnimationFrame(move)
    }
    frame = requestAnimationFrame(move)
    return () => cancelAnimationFrame(frame)
  }, [visible])

  if (!visible) return null

  /* ── pointer / keyboard handlers ─────────────────────────────── */
  const onGrab = (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const cur = position.current
    cur.dragging = true
    dragStart.current = { pointerX: event.clientX, pointerY: event.clientY, x: cur.x, lift: cur.lift, moved: false }
    setDragging(true)
  }
  const onDrag = (event) => {
    const start = dragStart.current
    if (!start) return
    const dx = event.clientX - start.pointerX
    const dy = event.clientY - start.pointerY
    if (Math.hypot(dx, dy) > 6) start.moved = true
    position.current.x    = clamp(start.x + dx, 12, Math.max(12, window.innerWidth  - (stage.current?.offsetWidth  || 84) - 18))
    position.current.lift = clamp(start.lift - dy, 0, Math.max(0, window.innerHeight - (stage.current?.offsetHeight || 128) - 24))
  }
  const onRelease = (event) => {
    const start = dragStart.current
    if (!start) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    position.current.dragging = false
    dragStart.current = null
    setDragging(false)
    if (!start.moved && event.type !== 'pointercancel') speak()
  }
  const onKey = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const cur = position.current
    if (event.key === 'ArrowLeft')  cur.x    -= 24
    if (event.key === 'ArrowRight') cur.x    += 24
    if (event.key === 'ArrowUp')    cur.lift += 24
    if (event.key === 'ArrowDown')  cur.lift -= 24
    cur.x    = clamp(cur.x,    12, Math.max(12, window.innerWidth  - (stage.current?.offsetWidth  || 84) - 18))
    cur.lift = clamp(cur.lift,  0, Math.max(0,  window.innerHeight - (stage.current?.offsetHeight || 128) - 24))
  }
  const dismiss = () => {
    clearTimeout(lineTimer.current)
    sessionStorage.setItem('banmai-pet-hidden', '1')
    setVisible(false)
  }

  return (
    <aside className="studio-pet" aria-label="Linh vật thợ ảnh Ban Mai">
      <div ref={stage} className={`studio-pet-stage${dragging ? ' is-dragging' : ''}`}>
        {line && (
          <div className="studio-pet-bubble" aria-live={manualLine ? 'polite' : 'off'}>
            {line}
          </div>
        )}

        {/* clickable pixel character */}
        <button
          className="studio-pet-figure"
          type="button"
          onClick={speak}
          aria-label="Nghe anh thợ ảnh nói một câu"
        >
          <PixelPet dragging={dragging} shooting={shooting} walking={walking} />
        </button>

        {/* invisible drag handle over body */}
        <button
          className="studio-pet-shirt"
          type="button"
          aria-label="Nắm áo nhân vật để kéo"
          title="Nắm áo và kéo mình đi chơi"
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          onKeyDown={onKey}
        />

        <button className="studio-pet-dismiss" type="button" onClick={dismiss} aria-label="Ẩn linh vật">×</button>
      </div>
    </aside>
  )
}
