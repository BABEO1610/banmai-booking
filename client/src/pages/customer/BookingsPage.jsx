import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { LoadingState, SessionLoading } from '../../components/Feedback.jsx'
import { vnd } from '../../hooks/useCatalog.js'
import api from '../../services/api.js'
import { statusLabel } from '../../utils/statusLabels.js'

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    if (user) {
      setLoading(true); setError('')
      api.bookings(page).then((data) => { if (active) { setItems(data.items); setPages(data.pages); setPage(data.page) } }).catch((err) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    }
    return () => { active = false }
  }, [user, page])
  if (authLoading) return <SessionLoading />
  if (!user) return <PublicLayout><main className="simple-page"><h1>Những lịch hẹn<br /><em>của riêng bạn.</em></h1><Link className="primary-button" to="/login">Đăng nhập để xem booking ↗</Link></main></PublicLayout>
  return <PublicLayout><main className="portal-page"><div className="portal-heading"><div><p className="eyebrow"><span /> Không gian của bạn</p><h1>Booking<br /><em>của tôi.</em></h1></div><Link className="primary-button" to="/book">Đặt lịch mới ↗</Link></div>{loading ? <LoadingState /> : error ? <p className="form-error" role="alert">{error}</p> : <div className="data-list">{items.length ? items.map((item) => <Link className="data-row" to={`/bookings/${item.id}/payment`} key={item.id}><div><span className="row-code">{item.code}</span><strong>{item.package.name}</strong><small>{new Date(item.startAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })}</small></div><div className="row-right"><span className={`status status-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span><strong>{vnd(item.total.amount)}</strong></div></Link>) : <div className="empty-state"><h2>Chưa có booking nào.</h2><p>Chọn một ngày đẹp để bắt đầu.</p><Link className="under-link" to="/book">Chọn buổi chụp ↗</Link></div>}</div>}{!loading && !error && pages > 1 && <nav className="pagination" aria-label="Trang lịch hẹn"><button className="secondary-button" disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page} / {pages}</span><button className="secondary-button" disabled={page === pages} onClick={() => setPage(page + 1)}>Trang sau</button></nav>}</main></PublicLayout>
}
