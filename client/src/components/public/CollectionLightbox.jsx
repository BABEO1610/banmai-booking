import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import StudioIcon from './StudioIcon.jsx'

export default function CollectionLightbox({ collection, name, initialIndex, onClose }) {
  const dialog = useRef(null)
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(1)
  const reduced = useReducedMotion()
  const { images } = collection
  const move = (step) => { setDirection(step); setIndex((current) => (current + step + images.length) % images.length) }
  useEffect(() => {
    const element = dialog.current
    const returnFocus = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => { element.close(); document.body.style.overflow = overflow; if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }) }
  }, [])
  const image = images[index]
  return createPortal(<dialog ref={dialog} className="collection-lightbox" aria-labelledby="lightbox-title" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} onKeyDown={(event) => {
    if (event.key === 'Tab') {
      const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
  }}>
    <div className="lightbox-panel"><header><div><h2 id="lightbox-title">{name}</h2><p>{collection.demo ? 'Bộ sưu tập cảm hứng · Ảnh minh họa' : 'Bộ sưu tập'}</p></div><button autoFocus className="lightbox-close" aria-label="Đóng ảnh lớn" onClick={onClose}><StudioIcon name="close" /></button></header>
      <div className="lightbox-stage"><AnimatePresence mode="wait" custom={direction} initial={false}><motion.img key={image.src} src={image.src} alt={image.alt} custom={direction} variants={{ enter: (d) => ({ opacity: 0, x: reduced ? 0 : d * 36 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: reduced ? 0 : -d * 24 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .2 }} /></AnimatePresence></div>
      <footer><button className="lightbox-prev" aria-label="Ảnh trước" disabled={images.length < 2} onClick={() => move(-1)}><StudioIcon /><span>Trước</span></button><div role="status" aria-atomic="true"><span>{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span><p>{image.caption}</p></div><button aria-label="Ảnh tiếp theo" disabled={images.length < 2} onClick={() => move(1)}><span>Sau</span><StudioIcon /></button></footer>
    </div>
  </dialog>, document.body)
}
