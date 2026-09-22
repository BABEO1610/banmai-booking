import { AnimatePresence, motion, useMotionTemplate, useSpring } from 'motion/react'
import { concepts } from '../../data/showcase.js'
import { studioEase } from '../../motion/presets.js'
import { ArrowIcon, SparkIcon } from './Icons.jsx'

const sparkles = [[8, 21, 5, 0], [88, 12, 7, 0.5], [93, 65, 4, 1.7], [12, 82, 6, 1.1], [58, 7, 4, 2.2], [77, 86, 5, 0.9]]

export default function HeroPhoto({ concept, activeIndex, onChoose, reduced }) {
  const rotateX = useSpring(0, { stiffness: 100, damping: 22 })
  const rotateY = useSpring(0, { stiffness: 100, damping: 22 })
  const lightX = useSpring(50, { stiffness: 100, damping: 25 })
  const lightY = useSpring(30, { stiffness: 100, damping: 25 })
  const light = useMotionTemplate`radial-gradient(350px circle at ${lightX}% ${lightY}%, rgba(255, 255, 255, 0.24), transparent 72%)`
  function moveLight(event) {
    if (reduced || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    rotateX.set((0.5 - y) * 5); rotateY.set((x - 0.5) * 5)
    lightX.set(x * 100); lightY.set(y * 100)
  }
  function resetLight() { rotateX.set(0); rotateY.set(0); lightX.set(50); lightY.set(30) }
  return <div className="hero-visual">
    <div className="hero-halo" aria-hidden="true" /><div className="light-orbit" aria-hidden="true"><span /></div>
    <motion.div className="photo-stage" onPointerMove={moveLight} onPointerLeave={resetLight} style={{ rotateX: reduced ? 0 : rotateX, rotateY: reduced ? 0 : rotateY }} initial={reduced ? false : { opacity: 0, clipPath: 'inset(8% 6% 8% 6% round 220px 220px 24px 24px)' }} animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 220px 220px 24px 24px)' }} transition={{ duration: reduced ? 0 : 0.85, ease: studioEase }}>
      <AnimatePresence initial={false}><motion.img key={concept.id} className="hero-image" src={concept.image} alt={concept.alt} width="1100" height={concept.height} fetchPriority="high" style={{ objectPosition: concept.position }} initial={reduced ? false : { opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.6, ease: studioEase }} /></AnimatePresence>
      <motion.div className="photo-light" style={{ background: reduced ? 'none' : light }} aria-hidden="true" /><div className="photo-vignette" aria-hidden="true" />
      {!reduced && <div className="sparkle-field" aria-hidden="true">{sparkles.map(([x, y, size, delay], i) => <span key={i} style={{ left: `${x}%`, top: `${y}%`, '--spark-size': `${size}px`, '--spark-delay': `${delay}s` }} />)}</div>}
      <div className="photo-caption"><span className="caption-line" /><div><span>{concept.name}</span><p>{concept.description}</p></div></div><button className="next-photo" aria-label="Xem concept tiếp theo" onClick={() => onChoose((activeIndex + 1) % concepts.length)}><ArrowIcon /></button>
    </motion.div>
    <motion.div className="floating-note" animate={reduced ? { y: 0 } : { y: [0, -7, 0] }} transition={{ duration: reduced ? 0 : 5, repeat: reduced ? 0 : Infinity, ease: 'easeInOut' }}><SparkIcon /><div>Giữ lại cảm xúc.<span>Đẹp theo cách của bạn.</span></div></motion.div>
    <div className="concept-switcher" role="group" aria-label="Chọn concept ảnh">{concepts.map((item, i) => <button key={item.id} onClick={() => onChoose(i)} aria-pressed={i === activeIndex} className={i === activeIndex ? 'active' : ''}>{i === activeIndex && <motion.span className="concept-active" layoutId="active-concept" transition={{ duration: reduced ? 0 : 0.3 }} />}<span className="concept-text">{item.name}</span></button>)}</div><span className="photo-credit">Ảnh minh họa, không phải portfolio thật</span>
  </div>
}
