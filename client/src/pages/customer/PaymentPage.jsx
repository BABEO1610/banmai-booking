import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { LoadingState } from '../../components/Feedback.jsx'
import { vnd } from '../../hooks/useCatalog.js'
import api from '../../services/api.js'
import { statusLabel } from '../../utils/statusLabels.js'

export default function PaymentPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const requestRef = useRef(null)
  useEffect(() => {
    let active = true, timer, inFlight = false, finished = false, controller
    setData(null); setError(''); setQrFailed(false)
    const refresh = async () => {
      if (inFlight || document.hidden || !active) return
      inFlight = true; setRefreshing(true); clearTimeout(timer)
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      try {
        const value = await api.payment(id, { signal: controller.signal })
        if (!active) return
        setData(value); setError('')
        finished = !value.pendingReview && (Number(value.remaining.amount) === 0 || ['EXPIRED', 'CANCELLED'].includes(value.status))
      } catch (err) { if (active) setError(err.name === 'AbortError' ? 'Kết nối chậm. Vui lòng thử lại.' : err.message) }
      finally {
        clearTimeout(timeout); inFlight = false
        if (active) { setRefreshing(false); if (!finished) timer = setTimeout(refresh, 10000) }
      }
    }
    const resume = () => { if (!finished) refresh() }
    requestRef.current = refresh
    refresh()
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('focus', resume)
    return () => { active = false; clearTimeout(timer); controller?.abort(); requestRef.current = null; document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume) }
  }, [id])
  const countingDown = data?.status === 'PENDING' && Number(data?.paid?.amount) === 0 && Date.parse(data?.holdExpiresAt) > clock
  useEffect(() => {
    if (!countingDown) return
    const timer = setInterval(() => { if (!document.hidden) setClock(Date.now()) }, 1000)
    return () => clearInterval(timer)
  }, [countingDown])
  const refresh = () => requestRef.current?.()
  useEffect(() => { setQrFailed(false) }, [data?.qrUrl])
  const balancePayment = data?.request.purpose === 'BALANCE'
  const fullyPaid = data && Number(data.remaining.amount) === 0
  const realPayment = data?.mode === 'SEPAY'
  const expired = data && !balancePayment && !Number(data.paid.amount) && (data.status !== 'PENDING' || new Date(data.holdExpiresAt).getTime() <= clock)
  const verified = data && Number(data.paid.amount) > 0
  return <PublicLayout><main className="payment-page"><Link className="back-link" to="/bookings">← Booking của tôi</Link>{error && <p className="form-error" role="alert">{error}</p>}{!data && !error && <LoadingState>Đang tải thông tin thanh toán…</LoadingState>}{data && <><p className="eyebrow"><span /> Thông tin thanh toán</p><h1>{fullyPaid ? 'Đã thanh toán' : balancePayment ? 'Thanh toán' : verified ? 'Cọc đã được' : 'Giữ chỗ bằng'}<br /><em>{fullyPaid ? 'đầy đủ.' : balancePayment ? 'phần còn lại.' : verified ? 'xác minh.' : 'một khoản cọc.'}</em></h1><div className="payment-grid"><section className="payment-card"><div className="demo-ribbon">{realPayment ? 'CHUYỂN KHOẢN · XÁC NHẬN QUA SEPAY' : 'DEMO · KHÔNG CHUYỂN TIỀN THẬT'}</div><p>Mã booking</p><strong className="booking-code">{data.code}</strong><div className="payment-amount"><span>{balancePayment ? 'Số tiền còn lại' : 'Số tiền cọc'}</span><strong>{vnd(data.request.amount.amount)}</strong></div><div className="payment-instruction">{data.pendingReview ? <p role="alert">Giao dịch đang chờ studio đối soát. Vui lòng không chuyển thêm; liên hệ studio và cung cấp mã booking.</p> : expired ? <p role="alert">Lịch giữ chỗ đã hết hiệu lực. Không chuyển tiền cho booking này; liên hệ studio nếu bạn đã chuyển.</p> : fullyPaid ? <p>Đã thanh toán đủ. Cảm ơn bạn!</p> : verified && !balancePayment ? <p>Cọc đã được ghi nhận. Không chuyển cọc thêm lần nữa.</p> : realPayment && !data.providerConfigured ? <p role="alert">Chưa có thông tin nhận tiền. Vui lòng liên hệ studio.</p> : <>{data.request.label}{realPayment && <p>Chủ tài khoản: <b>{data.accountHolder}</b><br />Ngân hàng: <b>{data.bankName}</b><br />Số tài khoản: <b>{data.bankAccount}</b><br />Kiểm tra tên người nhận trên ứng dụng ngân hàng trước khi xác nhận.</p>}{realPayment && data.qrUrl && !qrFailed && <img src={data.qrUrl} alt={balancePayment ? 'Mã QR thanh toán phần còn lại' : 'Mã QR chuyển khoản cọc đúng số tiền và mã booking'} width="280" height="280" style={{ display: 'block', maxWidth: '100%', height: 'auto', margin: '16px auto' }} onError={() => setQrFailed(true)} />}{realPayment && qrFailed && <p role="status">Không tải được QR. Bạn có thể chuyển khoản theo thông tin bên trên và nội dung bên dưới.</p>}<br />Nội dung: <b>{data.request.reference}</b>{realPayment && data.holdExpiresAt && <p>Giữ lịch đến: {new Date(data.holdExpiresAt).toLocaleString('vi-VN')}</p>}</>}</div><p className="payment-feedback">{realPayment ? 'Hệ thống cập nhật mỗi 10 giây sau khi nhận thông báo giao dịch. Nếu đã chuyển nhưng chưa xác nhận, không chuyển lại; liên hệ studio để đối soát.' : 'Không có QR ngân hàng thật. Admin mô phỏng và xác minh cọc trong bản demo; trang này tự cập nhật trạng thái mỗi 10 giây.'}</p><button className="secondary-button" disabled={refreshing} onClick={refresh}>{refreshing ? 'Đang cập nhật…' : 'Cập nhật trạng thái'}</button></section><aside className="payment-side"><span role="status" className={`status status-${data.paymentStatus.toLowerCase()}`}>{data.pendingReview ? 'Chờ đối soát' : statusLabel(data.paymentStatus)}</span><dl><div><dt>Tổng gói</dt><dd>{vnd(Number(data.remaining.amount) + Number(data.paid.amount))}</dd></div><div><dt>Đã xác minh</dt><dd>{vnd(data.paid.amount)}</dd></div><div><dt>Còn lại</dt><dd>{vnd(data.remaining.amount)}</dd></div></dl><p>Trạng thái chỉ thay đổi sau xác minh của hệ thống. Không xác nhận đã thanh toán từ thao tác của khách.</p></aside></div></>}</main></PublicLayout>
}
