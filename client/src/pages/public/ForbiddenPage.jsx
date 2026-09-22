import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { ROLE_HOME } from '../../constants/auth.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function ForbiddenPage() {
  const { user } = useAuth()
  return <PublicLayout><main className="simple-page"><p className="eyebrow"><span /> Khu vực riêng tư</p><h1>Bạn không có<br /><em>quyền truy cập.</em></h1><Link className="primary-button" to={ROLE_HOME[user?.role] || '/'}>Về trang của tôi ↗</Link></main></PublicLayout>
}
