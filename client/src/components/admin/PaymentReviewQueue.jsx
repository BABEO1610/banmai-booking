import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import { vnd } from '../../hooks/useCatalog.js'

const reasons = { AMOUNT_MISMATCH: 'Số tiền khác tiền cọc', HOLD_EXPIRED: 'Tiền đến sau hạn giữ chỗ', BOOKING_NOT_PENDING: 'Booking đã hết hạn hoặc đã được xử lý', UNKNOWN_REFERENCE: 'Không tìm thấy mã booking', AMBIGUOUS_REFERENCE: 'Có nhiều mã booking', ACCOUNT_MISMATCH: 'Khác tài khoản nhận', OUTGOING_TRANSFER: 'Giao dịch tiền ra' }

export default function PaymentReviewQueue() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = async () => {
    setLoading(true); setError('')
    try { setItems(await api.request('/admin/payments/review')) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])
  return <section className="admin-card wide-card">
    <div className="card-kicker">SePay · PENDING_REVIEW</div>
    <h2>Giao dịch cần đối soát</h2>
    <p>Các khoản này chưa cộng vào công nợ và chưa xác nhận lịch. Kiểm tra giao dịch ngân hàng và lịch còn chỗ trước khi xử lý với khách; hệ thống chưa tự hoàn tiền.</p>
    <button type="button" className="secondary-button" disabled={loading} onClick={refresh}>{loading ? 'Đang tải…' : 'Làm mới giao dịch'}</button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {!loading && !error && items.length === 0 && <p>Không có giao dịch chờ đối soát.</p>}
    <div className="audit-list">{items.map((item) => <div key={item.id} style={{ overflowWrap: 'anywhere' }}>
      <strong>{vnd(item.amountVnd)} · {item.bookingCode || 'Chưa xác định booking'}</strong>
      <p>{reasons[item.reason] || item.reason}</p>
      <small>SePay ID: {item.transactionId} · Tham chiếu: {item.referenceCode || '—'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small>
      <p>Nội dung: {item.content || '—'}</p>
    </div>)}</div>
  </section>
}
