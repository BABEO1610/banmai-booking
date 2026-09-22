import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'

export default function NotFoundPage() {
  return <PublicLayout><main className="simple-page"><p className="eyebrow">404 / Ngoài khung hình</p><h1>Trang này<br /><em>chưa có ở đây.</em></h1><p>Kiểm tra lại đường dẫn hoặc quay về trang chủ để tiếp tục.</p><Link className="primary-button" to="/">Về trang chủ <span aria-hidden="true">↗</span></Link></main></PublicLayout>
}
