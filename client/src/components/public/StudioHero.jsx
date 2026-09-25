import StudioImage from './StudioImage.jsx'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
const CameraInstallation = lazy(() => import('./CameraInstallation.jsx'))
import StudioIcon from './StudioIcon.jsx'
import './hero-poster.css'

const defaultHeroImage = '/images/daylight.jpg'

export default function StudioHero() {
  const [heroImage, setHeroImage] = useState(defaultHeroImage)
  const [heroStatus, setHeroStatus] = useState('ready')
  const [heroAttempt, setHeroAttempt] = useState(0)
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
    let disposed = false, retryTimer, timeout, abort
    setHeroStatus('loading')
    const load = async (attempt = 0) => {
      abort = new AbortController()
      timeout = setTimeout(() => abort.abort(), 8000)
      try {
        const response = await fetch('/api/v1/contents', { signal: abort.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Hero unavailable')
        const payload = await response.json()
        if (disposed) return
        const item = payload.data?.find((entry) => entry.key === 'home_intro')
        setHeroImage(item?.image || defaultHeroImage)
        setHeroStatus(item?.image ? 'ready' : 'fallback')
      } catch {
        if (disposed) return
        if (attempt < 2) retryTimer = setTimeout(() => load(attempt + 1), 1000 * (attempt + 1))
        else { setHeroImage((current) => current || defaultHeroImage); setHeroStatus('fallback') }
      } finally {
        clearTimeout(timeout)
      }
    }
    load()
    return () => { disposed = true; clearTimeout(retryTimer); clearTimeout(timeout); abort.abort() }
  }, [heroAttempt])
  const takeShot = () => {
    if (busy) return
    setShot((count) => count + 1)
    setBusy(true)
    shotTimer.current = setTimeout(() => setBusy(false), 900)
  }
  const stopped = paused || reduced || !inView || !tabVisible || focused || hovered
  const openInteractive = () => { setFocused(false); setInteractive(true) }
  const placeholder = (label, retry = false) => <div className="hero-poster hero-poster-placeholder"><span role="status">{label}{retry && <button className="hero-retry" onClick={() => setHeroAttempt((count) => count + 1)}>Tải lại ảnh</button>}</span><button className="secondary-button" onClick={openInteractive}>Khám phá máy ảnh 3D</button></div>
  const poster = heroImage
    ? <div className="hero-poster"><StudioImage src={heroImage} alt="Chân dung trong ánh sáng dịu" width="600" height="800" sizes="(max-width: 900px) 92vw, 52vw" fetchPriority="high" onError={() => { if (heroImage !== defaultHeroImage) { setHeroImage(defaultHeroImage); setHeroStatus('fallback') } else { setHeroImage(null); setHeroStatus('error') } }} /><button className="secondary-button" onClick={openInteractive}>Khám phá máy ảnh 3D</button></div>
    : placeholder(heroStatus === 'loading' ? 'Đang tải ảnh Studio…' : heroStatus === 'fallback' ? 'Đang dùng ảnh Studio mặc định.' : 'Chưa tải được ảnh Studio.', heroStatus === 'error')
  return <section ref={section} className={`landing-hero ${stopped ? 'motion-paused' : ''}`} aria-labelledby="hero-title" onFocusCapture={(event) => setFocused(!event.target.closest('.motion-toggle'))} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="photography-background" aria-hidden="true"><div className="studio-blush-light" /></div>
    <div className="landing-hero-inner">
      <div className="landing-hero-copy"><p className="studio-kicker"><span /> Studio chụp ảnh Ban Mai</p><h1 id="hero-title"><span className="hero-line">Một góc nhìn.</span><span className="hero-line"><span className="hero-handwritten">Rất riêng.</span></span><span className="hero-line">Rất bạn.</span></h1><p className="landing-hero-lede">Nghệ thuật bắt đầu từ cách bạn là chính mình.<br />Chúng mình bắt ánh sáng. Bạn mang câu chuyện.</p>
        <div className="landing-hero-actions"><Link className="primary-button" to="/book">Hẹn một buổi chụp <StudioIcon /></Link><Link className="quiet-link" to="/portfolio">Khám phá bộ ảnh <StudioIcon /></Link></div>
        <p className="landing-hero-note">Không cần biết tạo dáng.<br />Chỉ cần thoải mái là chính bạn.</p>
      </div>
      <figure className="hero-scene" onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }} onPointerLeave={() => setHovered(false)}><div className="scene-art-direction" aria-hidden="true"><span>ban mai / light studies</span><span>01 — The art of seeing</span></div>{interactive ? <Suspense fallback={<div className="hero-poster-loading" role="status">{placeholder('Đang mở góc Studio…')}</div>}><CameraInstallation paused={!!stopped} reduced={!!reduced} shot={shot} /></Suspense> : poster}<figcaption>{interactive ? "Đổi góc nhìn · Chơi cùng ánh sáng." : "Ánh sáng dịu. Những khoảnh khắc tự nhiên."}</figcaption></figure>
    </div>
    {interactive && <div className="landing-motion-bar"><span className="scene-description">Một góc Studio đang chuyển động</span><div className="scene-actions"><button className="motion-toggle" aria-pressed={paused} disabled={!!reduced} onClick={() => setPaused(!paused)}><StudioIcon name={paused ? 'play' : 'pause'} />{reduced ? 'Chế độ giảm chuyển động' : paused ? 'Bật nền động' : 'Tạm dừng nền động'}</button><button className="shutter-button" onClick={takeShot} disabled={busy}><StudioIcon name="camera" />{busy ? 'Đã chụp thử' : 'Chụp thử'}</button></div></div>}
    {interactive && <p className="shot-status" role="status" aria-atomic="true">{shot > 0 ? `Đã chụp thử ${shot} khung hình minh họa. Không sử dụng camera hay lưu ảnh của bạn.` : 'Sắp đặt máy ảnh 3D minh họa. Không truy cập camera của bạn.'}</p>}
  </section>
}
