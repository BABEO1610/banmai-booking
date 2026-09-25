import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import StudioHero from '../../components/public/StudioHero.jsx'
import StudioImage from '../../components/public/StudioImage.jsx'
import StudioIcon from '../../components/public/StudioIcon.jsx'

// Landing intentionally does not import catalog hooks, gallery or pricing components.
export default function HomePage() {
  const page = useRef(null)
  const [lightStudyImages, setLightStudyImages] = useState({ main: '/images/portrait-soft.jpg', detail: '/images/color-street.jpg' })
  useEffect(() => {
    let disposed = false
    fetch('/api/v1/contents', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (disposed) return
      const contents = payload?.data || []
      const main = contents.find((item) => item.key === 'home_light_main')?.image
      const detail = contents.find((item) => item.key === 'home_light_detail')?.image
      if (main || detail) setLightStudyImages((current) => ({ main: main || current.main, detail: detail || current.detail }))
    }).catch(() => {})
    return () => { disposed = true }
  }, [])
  useEffect(() => {
    const root = page.current
    root?.classList.add('motion-ready')
    const nodes = root ? [...root.querySelectorAll('[data-reveal]')] : []
    if (!nodes.length || !('IntersectionObserver' in window)) { nodes.forEach((node) => node.classList.add('is-visible')); return undefined }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) } }), { rootMargin: '0px 0px -12% 0px', threshold: .12 })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])
  return <PublicLayout><main ref={page} className="landing-page"><StudioHero />
    <section className="studio-introduction" data-reveal><p className="studio-kicker">Chụp ảnh theo cách của bạn</p><div><h2>Không chỉ là một tấm ảnh.<br /><em>Là cảm giác khi nhìn lại.</em></h2><p>Một chút ánh sáng, một chút tự nhiên. Ban Mai cùng bạn tìm góc nhìn phù hợp, từ những phút làm quen với ống kính đến lúc tự tin thể hiện câu chuyện của mình.</p></div><ol className="studio-process">{[['Lắng nghe bạn', 'Bạn thích sự tối giản, một chút nổi bật hay một cảm xúc rất riêng? Chúng mình bắt đầu từ đó.'], ['Chơi cùng ánh sáng', 'Cùng thử góc chụp, làm quen với máy ảnh và tìm cách thể hiện khiến bạn thoải mái.'], ['Giữ điều tự nhiên', 'Một nụ cười không gượng ép. Một ánh nhìn rất bạn. Những điều nhỏ làm nên một khung hình đáng nhớ.']].map(([title, copy], index) => <li key={title} data-reveal style={{ '--reveal-delay': `${index * 90}ms` }}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
    <section className="studio-light-study" data-reveal aria-labelledby="light-study-title"><div className="light-study-copy"><p className="studio-kicker">Nghiên cứu ánh sáng / 01</p><h2 id="light-study-title">Một chút sáng.<br /><em>Một chút rất bạn.</em></h2><p>Những khung hình này là gợi ý về ánh sáng và nhịp cảm xúc trong một buổi chụp Ban Mai.</p><Link className="quiet-link" to="/portfolio">Xem bộ ảnh <StudioIcon /></Link></div><div className="light-study-grid"><figure className="light-study-image light-study-image-main"><StudioImage src={lightStudyImages.main} alt="Nghiên cứu ánh sáng mềm trên chân dung" sizes="(max-width: 900px) 58vw, 40vw" loading="lazy" decoding="async" width="800" height="1000" /></figure><figure className="light-study-image light-study-image-detail"><StudioImage src={lightStudyImages.detail} alt="Nghiên cứu màu sắc và ánh sáng ngoài trời" sizes="(max-width: 900px) 38vw, 25vw" loading="lazy" decoding="async" width="800" height="1000" /></figure></div></section>
    <section className="studio-destinations" data-reveal aria-labelledby="explore-title"><div className="destinations-heading"><h2 id="explore-title">Bạn muốn bắt đầu từ đâu?</h2><p>Mỗi phần có một không gian riêng để bạn khám phá.</p></div><div className="destination-links">{[
      ['/portfolio', 'Bộ ảnh', 'Tìm cảm hứng và chọn concept bạn yêu thích.'],
      ['/packages', 'Gói chụp', 'Xem thời gian, quyền lợi và giá từng gói.'],
      ['/policy', 'Chính sách', 'Đọc thông tin trước khi hẹn một buổi chụp.'],
    ].map(([to, name, copy]) => <Link to={to} key={to}><div><h3>{name}</h3><p>{copy}</p></div><StudioIcon /></Link>)}</div></section>
  </main></PublicLayout>
}
