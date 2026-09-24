import StudioImage from './StudioImage.jsx'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
const CameraInstallation = lazy(() => import('./CameraInstallation.jsx'))
import StudioIcon from './StudioIcon.jsx'
import './hero-poster.css'

export default function StudioHero() {
  const [heroImage, setHeroImage] = useState(null)
  const [interactive, setInteractive] = useState(false)
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
  useEffect(() => {
    const abort = new AbortController()
    fetch('/api/v1/contents', { signal: abort.signal, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Hero unavailable')))
      .then((payload) => { const item = payload.data?.find((entry) => entry.key === 'home_intro'); if (item?.image) setHeroImage(item.image) })
      .catch(() => {})
    return () => abort.abort()
  }, [])
  const takeShot = () => {
    if (busy) return
    setShot((count) => count + 1)
    setBusy(true)
    shotTimer.current = setTimeout(() => setBusy(false), 900)
  }
  const stopped = paused || reduced || !inView || !tabVisible || focused || hovered
  const openInteractive = () => { setFocused(false); setInteractive(true) }
  const placeholder = (label) => <div className="hero-poster hero-poster-placeholder"><span>{label}</span><button className="secondary-button" onClick={openInteractive}>Khám phá máy ảnh 3D</button></div>
  const poster = heroImage
    ? <div className="hero-poster"><StudioImage src={heroImage} alt="Chân dung trong ánh sáng dịu" width="600" height="800" fetchPriority="high" /><button className="secondary-button" onClick={openInteractive}>Khám phá máy ảnh 3D</button></div>
    : placeholder('Đang tải ảnh Studio…')
  return <section ref={section} className={`landing-hero ${stopped ? 'motion-paused' : ''}`} aria-labelledby="hero-title" onFocusCapture={(event) => setFocused(!event.target.closest('.motion-toggle'))} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="photography-background" aria-hidden="true"><div className="studio-blush-light" /></div>
    <div className="landing-hero-inner">
      <div className="landing-hero-copy"><p className="studio-kicker"><span /> Studio chụp ảnh Ban Mai</p><h1 id="hero-title">Một góc nhìn.<br /><span className="hero-handwritten">Rất riêng.</span><br />Rất bạn.</h1><p className="landing-hero-lede">Nghệ thuật bắt đầu từ cách bạn là chính mình.<br />Chúng mình bắt ánh sáng. Bạn mang câu chuyện.</p>
        <div className="landing-hero-actions"><Link className="primary-button" to="/book">Hẹn một buổi chụp <StudioIcon /></Link><Link className="quiet-link" to="/portfolio">Khám phá bộ ảnh <StudioIcon /></Link></div>
        <p className="landing-hero-note">Không cần biết tạo dáng.<br />Chỉ cần thoải mái là chính bạn.</p>
      </div>
      <figure className="hero-scene" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }} onPointerLeave={() => setHovered(false)}><div className="scene-art-direction" aria-hidden="true"><span>ban mai / light studies</span><span>01 — The art of seeing</span></div>{interactive ? <Suspense fallback={<div className="hero-poster-loading" role="status">{placeholder('Đang mở góc Studio…')}</div>}><CameraInstallation paused={!!stopped} reduced={!!reduced} shot={shot} /></Suspense> : poster}<figcaption>{interactive ? "Đổi góc nhìn · Chơi cùng ánh sáng." : "Ánh sáng dịu. Những khoảnh khắc tự nhiên."}</figcaption></figure>
    </div>
    {interactive && <div className="landing-motion-bar"><span className="scene-description">Một góc Studio đang chuyển động</span><div className="scene-actions"><button className="motion-toggle" aria-pressed={paused} disabled={!!reduced} onClick={() => setPaused(!paused)}><StudioIcon name={paused ? 'play' : 'pause'} />{reduced ? 'Chế độ giảm chuyển động' : paused ? 'Bật nền động' : 'Tạm dừng nền động'}</button><button className="shutter-button" onClick={takeShot} disabled={busy}><StudioIcon name="camera" />{busy ? 'Đã chụp thử' : 'Chụp thử'}</button></div></div>}
    {interactive && <p className="shot-status" role="status" aria-atomic="true">{shot > 0 ? `Đã chụp thử ${shot} khung hình minh họa. Không sử dụng camera hay lưu ảnh của bạn.` : 'Sắp đặt máy ảnh 3D minh họa. Không truy cập camera của bạn.'}</p>}
  </section>
}
