import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import CameraInstallation from './CameraInstallation.jsx'
import StudioIcon from './StudioIcon.jsx'

export default function StudioHero() {
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(!document.hidden)
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [shot, setShot] = useState(0)
  const [busy, setBusy] = useState(false)
  const reduced = useReducedMotion()
  const section = useRef(null)
  const shotTimer = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    observer.observe(section.current)
    const onVisibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(shotTimer.current)
    }
  }, [])
  const takeShot = () => {
    if (busy) return
    setShot((count) => count + 1)
    setBusy(true)
    shotTimer.current = setTimeout(() => setBusy(false), 900)
  }
  const stopped = paused || reduced || !inView || !tabVisible || focused || hovered
  return <section ref={section} className={`landing-hero ${stopped ? 'motion-paused' : ''}`} aria-labelledby="hero-title" onFocusCapture={(event) => setFocused(!event.target.closest('.motion-toggle'))} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="photography-background" aria-hidden="true"><div className="studio-blush-light" /></div>
    <div className="landing-hero-inner">
      <div className="landing-hero-copy"><p className="studio-kicker"><span /> Studio chụp ảnh Ban Mai</p><h1 id="hero-title">Một góc nhìn.<br /><span className="hero-handwritten">Rất riêng.</span><br />Rất bạn.</h1><p className="landing-hero-lede">Nghệ thuật bắt đầu từ cách bạn là chính mình.<br />Chúng mình bắt ánh sáng. Bạn mang câu chuyện.</p>
        <div className="landing-hero-actions"><Link className="primary-button" to="/book">Hẹn một buổi chụp <StudioIcon /></Link><Link className="quiet-link" to="/portfolio">Khám phá bộ ảnh <StudioIcon /></Link></div>
        <p className="landing-hero-note">Không cần biết tạo dáng.<br />Chỉ cần thoải mái là chính bạn.</p>
      </div>
      <figure className="hero-scene" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }} onPointerLeave={() => setHovered(false)}><div className="scene-art-direction" aria-hidden="true"><span>ban mai / light studies</span><span>01 — The art of seeing</span></div><CameraInstallation paused={!!stopped} reduced={!!reduced} shot={shot} /><figcaption>Đổi góc nhìn · Chơi cùng ánh sáng · Thử một lần bấm máy.</figcaption></figure>
    </div>
    <div className="landing-motion-bar"><span className="scene-description">Một góc Studio đang chuyển động</span><div className="scene-actions"><button className="motion-toggle" aria-pressed={paused} disabled={!!reduced} onClick={() => setPaused(!paused)}><StudioIcon name={paused ? 'play' : 'pause'} />{reduced ? 'Chế độ giảm chuyển động' : paused ? 'Bật nền động' : 'Tạm dừng nền động'}</button><button className="shutter-button" onClick={takeShot} disabled={busy}><StudioIcon name="camera" />{busy ? 'Đã chụp thử' : 'Chụp thử'}</button></div></div>
    <p className="shot-status" role="status" aria-atomic="true">{shot > 0 ? `Đã chụp thử ${shot} khung hình minh họa. Không sử dụng camera hay lưu ảnh của bạn.` : 'Sắp đặt máy ảnh 3D minh họa. Không truy cập camera của bạn.'}</p>
  </section>
}
