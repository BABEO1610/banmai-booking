import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import StudioHero from '../../components/public/StudioHero.jsx'
import StudioIcon from '../../components/public/StudioIcon.jsx'

// Landing intentionally does not import catalog hooks, gallery or pricing components.
export default function HomePage() {
  return <PublicLayout><main className="landing-page"><StudioHero />
    <section className="studio-introduction"><p className="studio-kicker">Chụp ảnh theo cách của bạn</p><div><h2>Không chỉ là một tấm ảnh.<br /><em>Là cảm giác khi nhìn lại.</em></h2><p>Một chút ánh sáng, một chút tự nhiên. Ban Mai cùng bạn tìm góc nhìn phù hợp, từ những phút làm quen với ống kính đến lúc tự tin thể hiện câu chuyện của mình.</p></div><ol className="studio-process">{[['Lắng nghe bạn', 'Bạn thích sự tối giản, một chút nổi bật hay một cảm xúc rất riêng? Chúng mình bắt đầu từ đó.'], ['Chơi cùng ánh sáng', 'Cùng thử góc chụp, làm quen với máy ảnh và tìm cách thể hiện khiến bạn thoải mái.'], ['Giữ điều tự nhiên', 'Một nụ cười không gượng ép. Một ánh nhìn rất bạn. Những điều nhỏ làm nên một khung hình đáng nhớ.']].map(([title, copy], index) => <li key={title}><span aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
    <section className="studio-destinations" aria-labelledby="explore-title"><div className="destinations-heading"><h2 id="explore-title">Bạn muốn bắt đầu từ đâu?</h2><p>Mỗi phần có một không gian riêng để bạn khám phá.</p></div><div className="destination-links">{[
      ['/portfolio', 'Bộ ảnh', 'Tìm cảm hứng và chọn concept bạn yêu thích.'],
      ['/packages', 'Gói chụp', 'Xem thời gian, quyền lợi và giá từng gói.'],
      ['/policy', 'Chính sách', 'Đọc thông tin trước khi hẹn một buổi chụp.'],
    ].map(([to, name, copy]) => <Link to={to} key={to}><div><h3>{name}</h3><p>{copy}</p></div><StudioIcon /></Link>)}</div></section>
  </main></PublicLayout>
}
