import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import api from '../../services/api.js'
import { statusLabel } from '../../utils/statusLabels.js'
const AccountManagement = lazy(() => import('../../components/admin/AccountManagement.jsx'))
import { LoadingState, SessionLoading } from '../../components/Feedback.jsx'
import LocationPicker from '../../components/booking/LocationPicker.jsx'
const PackageCatalogEditor = lazy(() => import('../../components/admin/PackageCatalogEditor.jsx'))
const PortfolioManager = lazy(() => import('../../components/admin/PortfolioManager.jsx'))
const StudioCalendar = lazy(() => import('../../components/admin/StudioCalendar.jsx'))
const HomeContentEditor = lazy(() => import('../../components/admin/HomeContentEditor.jsx'))

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

function StatCard({ label, value, detail, onClick }) {
  return <button className="admin-stat" onClick={onClick} type="button"><span>{label}</span><strong>{value}</strong><small>{detail}</small></button>
}

function BookingEditor({ booking, photographers, csrf, onDone, onError }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [contact, setContact] = useState({ ...booking.contact })
  const [location, setLocation] = useState({ ...booking.location })
  const [notes, setNotes] = useState(booking.notes || '')
  const [internalNotes, setInternalNotes] = useState(booking.internalNotes || '')
  const [receipt, setReceipt] = useState({ amountVnd: '', method: 'CASH', note: '' })
  const [assignment, setAssignment] = useState({ photographerId: booking.assignment?.photographerId || '', payoutVnd: booking.assignment?.payoutVnd || '' })
  useEffect(() => { if (!open) { setDetail(null); setContact({ ...booking.contact }); setLocation({ ...booking.location }); setNotes(booking.notes || ''); setInternalNotes(booking.internalNotes || ''); setAssignment({ photographerId: booking.assignment?.photographerId || '', payoutVnd: booking.assignment?.payoutVnd || '' }) } else { setDetailLoading(true); api.booking(booking.id).then((value) => { setDetail(value); setContact({ ...value.contact }); setLocation({ ...value.location }); setNotes(value.notes || ''); setInternalNotes(value.internalNotes || ''); setAssignment({ photographerId: value.assignment?.photographerId || '', payoutVnd: value.assignment?.payoutVnd || '' }) }).catch(onError).finally(() => setDetailLoading(false)) } }, [booking, open])
  const view = detail || booking
  const save = async (event) => { event.preventDefault(); setBusy(true); try { await api.updateBooking(view.id, { contact, location, notes, internalNotes, version: view.version }, csrf); await onDone() } catch (error) { onError(error) } finally { setBusy(false) } }
  const assign = async (event) => { event.preventDefault(); setBusy(true); try { await api.assign(view.id, { ...assignment, version: view.version }, csrf); await onDone() } catch (error) { onError(error) } finally { setBusy(false) } }
  const receive = async (event) => { event.preventDefault(); setBusy(true); try { await api.recordReceipt(view.id, receipt, csrf); setReceipt({ amountVnd: '', method: 'CASH', note: '' }); await onDone() } catch (error) { onError(error) } finally { setBusy(false) } }
  return <div className="booking-editor">
    <button className="secondary-button editor-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Thu gọn' : 'Mở chi tiết'}</button>
    {open && <div className="editor-grid">{detailLoading && <p className="muted-note">Đang tải chi tiết booking…</p>}
      {(!contact.phone || !location.name) && <p className="booking-missing-note" role="status">Thiếu dữ liệu cần bổ sung: {!contact.phone && 'số điện thoại'}{!contact.phone && !location.name ? ' và ' : ''}{!location.name && 'địa điểm (có thể trao đổi sau)'}.</p>}
      <form onSubmit={save} className="editor-form"><h3>Thông tin khách và địa điểm</h3>
        <label>Tên khách<input value={contact.name || ''} onChange={(e) => setContact({ ...contact, name: e.target.value })} required /></label>
        <label>Số điện thoại<input value={contact.phone || ''} onChange={(e) => setContact({ ...contact, phone: e.target.value })} required /></label>
        <label>Link Facebook<input type="url" value={contact.facebook || ''} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} /></label>
        <label>Số người<input type="number" min="1" value={contact.peopleCount || 1} onChange={(e) => setContact({ ...contact, peopleCount: e.target.value })} required /></label>
        <LocationPicker value={location} onChange={setLocation} />
        <label>Yêu cầu của khách<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" /></label>
        <label>Ghi chú nội bộ<textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows="3" /></label>
        <div className="booking-captured-data"><strong>Gói và option khách đã chọn</strong><span>{view.package?.name || 'Chưa có gói'} · {view.package?.timeLabel || 'Chưa có thời lượng'}</span>{view.package?.selectedOptions?.length ? <ul>{view.package.selectedOptions.map((item) => <li key={item.id}>{item.name} × {item.quantity}</li>)}</ul> : <small>Không có option thêm</small>}</div>
        <button className="primary-button" disabled={busy || view.status === 'COMPLETED'}>Lưu thông tin</button>
      </form>
      <div className="editor-form"><h3>Điều phối và tài chính</h3>
        <div className="booking-status-note"><strong>{view.status === 'CONFIRMED' ? 'Booking đã xác nhận cọc' : `Chưa thể phân photographer: ${view.status === 'PENDING' ? 'đang chờ xác nhận cọc' : view.status === 'EXPIRED' ? 'khung giữ chỗ đã hết hạn' : 'booking chưa ở trạng thái xác nhận'}`}</strong><span>Chỉ booking đã xác nhận mới được phân hoặc đổi photographer.</span></div>
        <form onSubmit={assign}><label>Photographer<select required disabled={view.status !== 'CONFIRMED'} value={assignment.photographerId} onChange={(e) => setAssignment({ ...assignment, photographerId: e.target.value })}><option value="">Chọn photographer</option>{photographers.map((person) => <option key={person.id} value={person.id} disabled={person.status !== 'ACTIVE'}>{person.name} · {person.status}</option>)}</select></label><label>Tiền công<input type="number" min="0" value={assignment.payoutVnd} onChange={(e) => setAssignment({ ...assignment, payoutVnd: e.target.value })} required /></label><button className="secondary-button" disabled={busy || view.status !== 'CONFIRMED'}>{view.assignment ? 'Đổi photographer' : 'Phân photographer'}</button></form>
        <div className="editor-summary"><span>Tổng tiền <b>{money(view.total.amount)}</b></span><span>Đã thu <b>{money(view.paid.amount)}</b></span><span>Còn lại <b>{money(view.remaining.amount)}</b></span></div>
        <form onSubmit={receive} className="receipt-form"><h4>Ghi nhận tiền sau cọc</h4><label>Số tiền<input type="number" min="1" step="1" value={receipt.amountVnd} onChange={(e) => setReceipt({ ...receipt, amountVnd: e.target.value })} required /></label><label>Phương thức<select value={receipt.method} onChange={(e) => setReceipt({ ...receipt, method: e.target.value })}><option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option><option value="CARD">Thẻ</option></select></label><label>Ghi chú<input value={receipt.note} onChange={(e) => setReceipt({ ...receipt, note: e.target.value })} /></label><button className="secondary-button" disabled={busy || !['CONFIRMED', 'COMPLETED'].includes(view.status) || Number(view.remaining.amount) <= 0}>Ghi nhận khoản thu</button></form>
      </div>
    </div>}
  </div>
}

export default function AdminPage() {
  const { user, csrf, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('bookings')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [data, setData] = useState({ dashboard: null, settings: null, bookings: [], photographers: [], users: [], customers: [], integrations: null, audit: [], blocks: [], catalog: null })
  const requestId = useRef(0)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ q: '', status: '', photographerId: '' })
  const [settingsForm, setSettingsForm] = useState({ maxConcurrentBookings: 2, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, timezone: 'Asia/Ho_Chi_Minh' })
  const refresh = async (nextFilters = filters, page = pagination.page) => {
    const id = ++requestId.current
    setError('')
    const loaders = {
      overview: { dashboard: api.dashboard, bookingsPage: () => api.adminBookings({ from: new Date().toISOString(), page: 1, pageSize: 6 }) },
      bookings: { bookingsPage: () => api.adminBookings({ ...nextFilters, page }), photographers: api.photographers },
      calendar: {}, customers: { customers: api.customers },
      people: { users: api.users, photographers: api.photographers },
      catalog: { catalog: () => api.request('/admin/catalog') },
      portfolio: { catalog: () => api.request('/admin/catalog') },
      home: { catalog: () => api.request('/admin/catalog') },
      settings: { settings: api.settings }, integrations: { integrations: api.integrations }, audit: { audit: api.audit },
    }
    const entries = Object.entries(loaders[tab] || {})
    const results = await Promise.allSettled(entries.map(([, load]) => load()))
    if (id !== requestId.current) return
    const patch = {}
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') patch[entries[index][0]] = result.value
      else setError(result.reason?.message || 'Không thể tải dữ liệu vận hành')
    })
    if (patch.bookingsPage) {
      const result = patch.bookingsPage
      patch.bookings = result.items
      if (tab === 'bookings') setPagination(result)
      delete patch.bookingsPage
    }
    if (patch.settings) setSettingsForm(patch.settings)
    setData(previous => ({ ...previous, ...patch }))
    setLoading(false)
  }
  useEffect(() => {
    if (user?.role === 'ADMIN') { setLoading(true); refresh(filters, 1) }
    return () => { requestId.current++ }
  }, [user, tab])
  const applyFilters = event => { event.preventDefault(); refresh(filters, 1) }
  const saveSettings = async (event) => { event.preventDefault(); try { await api.updateSettings(settingsForm, csrf); setMessage('Đã lưu cấu hình nhận booking.'); await refresh() } catch (err) { setError(err.message) } }
  const complete = async (booking) => { try { await api.complete(booking.id, csrf); setMessage(`Đã hoàn tất ${booking.code}.`); await refresh() } catch (err) { setError(err.message) } }
  const tabs = [['overview', 'Tổng quan'], ['bookings', 'Booking'], ['calendar', 'Lịch studio'], ['customers', 'Khách hàng'], ['people', 'Nhân sự'], ['catalog', 'Gói & dịch vụ'], ['portfolio', 'Bộ ảnh'], ['home', 'Trang chủ'], ['settings', 'Cấu hình'], ['integrations', 'Đồng bộ'], ['audit', 'Nhật ký']]
  const upcoming = useMemo(() => data.bookings.filter((booking) => new Date(booking.startAt) >= new Date()).slice(0, 6), [data.bookings])
  if (authLoading) return <SessionLoading />
  if (!user) return <PublicLayout workspace><main className="simple-page"><h1>Khu vực vận hành.</h1><Link className="primary-button" to="/login">Đăng nhập Admin ↗</Link></main></PublicLayout>
  if (user.role !== 'ADMIN') return <PublicLayout workspace><main className="simple-page"><h1>Không có quyền truy cập.</h1></main></PublicLayout>
  return <PublicLayout workspace><main className="admin-page admin-workspace"><Suspense fallback={<LoadingState />}>
    <header className="admin-hero"><div><p className="eyebrow"><span /> Chủ Studio · Admin workspace</p><h1>Vận hành<br /><em>rõ ràng hơn.</em></h1><p className="admin-lede">Một nơi để theo dõi lịch, điều phối photographer, cập nhật công nợ và gửi dữ liệu đã kiểm tra sang Sheets.</p></div></header>
    <nav className="admin-tabs" aria-label="Khu vực quản trị">{tabs.map(([value, label]) => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {message && <p className="success-message" role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading && <LoadingState>Đang tải dữ liệu vận hành…</LoadingState>}
    {!loading && tab === 'overview' && <section className="admin-section"><div className="admin-stats">{[['today', 'Booking hôm nay', 'ca'], ['upcoming', 'Sắp tới', 'booking'], ['unassigned', 'Chưa phân thợ', 'cần xử lý']].map(([key, label, detail]) => <StatCard key={key} label={label} value={data.dashboard?.[key] || 0} detail={detail} onClick={() => setTab(key === 'unassigned' ? 'bookings' : key === 'today' ? 'calendar' : 'bookings')} />)}<StatCard label="Còn phải thu" value={money(data.dashboard?.outstandingVnd)} detail="tổng công nợ" onClick={() => setTab('bookings')} /><StatCard label="Sheets lỗi" value={data.dashboard?.sheetsErrors || 0} detail="tác vụ cần thử lại" onClick={() => setTab('integrations')} /></div><div className="admin-two-column"><section className="admin-card"><div className="card-kicker">Lịch sắp tới</div><h2>Những ca cần nhìn thấy trước</h2>{upcoming.length ? <div className="admin-mini-list">{upcoming.map((booking) => <div key={booking.id}><strong>{booking.code}</strong><span>{dateTime(booking.startAt)}</span><small>{booking.contact?.name || 'Chưa có tên'} · {booking.assignment?.photographerName || 'Chưa phân thợ'}</small></div>)}</div> : <p className="muted-note">Chưa có booking sắp tới.</p>}</section><section className="admin-card"><div className="card-kicker">Nguyên tắc hôm nay</div><h2>Sheets là bản tổng hợp</h2><p className="admin-copy">Mọi chỉnh sửa thực hiện trên admin. Google Sheets nhận dữ liệu một chiều sau khi booking được xác nhận và có photographer, có retry khi mạng hoặc quyền truy cập gặp lỗi.</p><button className="secondary-button" type="button" onClick={() => setTab('integrations')}>Xem trạng thái đồng bộ ↗</button></section></div></section>}
    {!loading && tab === 'bookings' && <section className="admin-section"><div className="section-heading"><div><p className="card-kicker">Booking backlog</p><h2>Điều phối từng buổi chụp</h2></div><span className="muted-note">{pagination.total} kết quả</span></div><form className="admin-filter" onSubmit={applyFilters}><label>Tìm booking/khách<input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="BM-… hoặc số điện thoại" /></label><label>Trạng thái<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả</option><option value="PENDING">Chờ cọc</option><option value="CONFIRMED">Đã xác nhận</option><option value="COMPLETED">Hoàn tất</option><option value="EXPIRED">Hết hạn</option></select></label><label>Photographer<select value={filters.photographerId} onChange={(e) => setFilters({ ...filters, photographerId: e.target.value })}><option value="">Tất cả</option>{data.photographers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button className="primary-button">Lọc danh sách</button></form><div className="booking-stack">{data.bookings.length ? data.bookings.map((booking) => <article className="admin-booking-card" key={booking.id}><div className="booking-main"><span className="row-code">{booking.code}</span><strong>{booking.contact?.name || 'Chưa có tên khách'}</strong><small>{booking.package.name} · {dateTime(booking.startAt)}</small><small>{booking.location?.name || 'Chưa có địa điểm'} · {booking.assignment?.photographerName || 'Chưa phân thợ'}</small><span className={`status status-${booking.status.toLowerCase()}`}>{statusLabel(booking.status)}</span></div><div className="booking-finance"><span>Tổng <b>{money(booking.total.amount)}</b></span><span>Đã thu <b>{money(booking.paid.amount)}</b></span><span>Còn <b>{money(booking.remaining.amount)}</b></span><span className={`sheet-state sheet-${String(booking.sheets?.status || '').toLowerCase()}`}>Sheets: {booking.sheets?.status || '—'}</span></div>{booking.status === 'PENDING' && <div className="booking-actions"><p className="muted-note">Chỉ phân ca sau khi booking được xác nhận.</p></div>}<BookingEditor booking={booking} photographers={data.photographers} csrf={csrf} onDone={refresh} onError={(err) => setError(err.message)} /><div className="booking-footer-actions">{booking.status === 'CONFIRMED' && booking.assignment && <button className="small-action" type="button" onClick={() => complete(booking)}>Hoàn tất buổi chụp</button>}<span className="muted-note">Cập nhật {dateTime(booking.updatedAt)}</span></div></article>) : <div className="empty-state"><h3>Chưa có booking phù hợp</h3><p>Thử bỏ bộ lọc hoặc kiểm tra luồng tạo hold của Customer.</p></div>}</div></section>}
    {!loading && tab === 'bookings' && <nav className="pagination" aria-label="Trang booking"><button className="secondary-button" disabled={pagination.page <= 1} onClick={() => refresh(filters, pagination.page - 1)}>Trang trước</button><span>Trang {pagination.page} / {pagination.pages}</span><button className="secondary-button" disabled={pagination.page >= pagination.pages} onClick={() => refresh(filters, pagination.page + 1)}>Trang sau</button></nav>}
    {!loading && tab === 'calendar'  && <StudioCalendar csrf={csrf} />}
    {!loading && tab === 'customers' && <section className="admin-section"><section className="admin-card wide-card"><div className="card-kicker">Customer directory</div><h2>Khách hàng và lịch sử đặt lịch</h2><div className="customer-list">{data.customers.length ? data.customers.map((customer) => <article key={customer.id}><div><strong>{customer.name || 'Khách hàng'}</strong><span>{customer.email}</span><small>{customer.emailVerified ? 'Đã xác thực email' : 'Chưa xác thực email'}</small></div><div>{customer.bookings?.length ? customer.bookings.map((booking) => <button key={booking.id} type="button" className="customer-booking" onClick={() => { setFilters({ ...filters, q: booking.code }); setTab('bookings') }}>{booking.code} · {statusLabel(booking.status)} · {money(booking.totalVnd)}</button>) : <span className="muted-note">Chưa có booking</span>}</div></article>) : <p className="muted-note">Chưa có tài khoản khách hàng.</p>}</div></section></section>}
    {!loading && tab === 'people' && <section className="admin-section"><AccountManagement users={data.users} csrf={csrf} onDone={refresh} /><section className="admin-card wide-card"><div className="card-kicker">Photographer</div><h2>Khả năng nhận ca</h2><div className="people-grid">{data.photographers.map((person) => <div key={person.id}><strong>{person.name}</strong><span>{person.email}</span><small className={person.status === 'ACTIVE' ? 'text-success' : 'text-muted'}>{person.status === 'ACTIVE' ? 'Đang nhận ca' : 'Đang khóa'}</small></div>)}</div></section></section>}
    {!loading && tab === 'catalog' && <section className="admin-section"><PackageCatalogEditor catalog={data.catalog} csrf={csrf} onDone={refresh} onError={(err) => setError(err.message)} /><section className="admin-card wide-card"><div className="card-kicker">Dịch vụ thêm</div><h2>Addon hiển thị cho khách</h2><div className="catalog-admin-list">{data.catalog?.addons?.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{money(item.price?.amount || item.priceVnd)} · {item.unit}</span></div>)}</div></section></section>}
    {!loading && tab === 'portfolio' && <section className="admin-section"><PortfolioManager portfolio={data.catalog?.portfolio || []} csrf={csrf} onDone={refresh} onError={(err) => setError(err.message)} /></section>}
    {!loading && tab === 'home' && <section className="admin-section"><HomeContentEditor content={data.catalog?.contents?.find((item) => item.key === 'home_intro')} csrf={csrf} onDone={async () => { setMessage('Đã lưu ảnh trang chủ.'); await refresh() }} onError={(err) => setError(err.message)} /></section>}
    {!loading && tab === 'settings' && <section className="admin-section"><form className="admin-card settings-card" onSubmit={saveSettings}><div className="card-kicker">Booking settings</div><h2>Giới hạn nhận khách</h2><p>Giới hạn này độc lập số photographer. Hold và booking đã xác nhận cùng tiêu thụ sức chứa.</p><label>Booking đồng thời<input type="number" min="1" required value={settingsForm.maxConcurrentBookings} onChange={(e) => setSettingsForm({ ...settingsForm, maxConcurrentBookings: e.target.value })} /></label><div className="two-fields"><label>Buffer trước (phút)<input type="number" min="0" value={settingsForm.bufferBeforeMinutes} onChange={(e) => setSettingsForm({ ...settingsForm, bufferBeforeMinutes: e.target.value })} /></label><label>Buffer sau (phút)<input type="number" min="0" value={settingsForm.bufferAfterMinutes} onChange={(e) => setSettingsForm({ ...settingsForm, bufferAfterMinutes: e.target.value })} /></label></div><label>Múi giờ<input value={settingsForm.timezone} onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })} /></label><button className="primary-button">Lưu cấu hình</button>{data.settings && <small className="muted-note">Phiên bản {data.settings.version} · cập nhật {dateTime(data.settings.updatedAt)}</small>}</form></section>}
    {!loading && tab === 'integrations' && <section className="admin-section"><PaymentReviewQueue /><section className="admin-card integration-hero"><div><div className="card-kicker">Google Sheets</div><h2>Đồng bộ một chiều cho chủ studio</h2><p>{data.integrations?.sheets?.note || 'Đang kiểm tra kết nối…'}</p></div><div className="integration-actions"><button className="primary-button" type="button" onClick={async () => { try { await api.syncSheets(csrf); setMessage('Đã đưa các booking đủ điều kiện vào hàng đợi Sheets.'); await refresh() } catch (err) { setError(err.message) } }}>Đồng bộ lại tất cả</button><button className="secondary-button" type="button" onClick={async () => { try { await api.retryIntegration('sheets', csrf); setMessage('Đã thử lại các tác vụ Sheets.'); await refresh() } catch (err) { setError(err.message) } }}>Thử lại lỗi</button></div></section><div className="integration-grid">{data.integrations?.services?.map((service) => <div className="admin-card service-card" key={service.target}><span className="service-dot" /><strong>{service.target}</strong><span>{service.note}</span><b>{service.status}</b></div>)}<div className="admin-card service-card"><span className="service-dot" /><strong>sheets</strong><span>{data.integrations?.sheets?.note}</span><b>{data.integrations?.sheets?.status}</b></div></div><section className="admin-card wide-card"><div className="card-kicker">Outbox</div><h2>Hàng đợi gần đây</h2><div className="audit-list">{data.integrations?.outbox?.map((item) => <div key={item.id}><span>{item.type} · {item.status}</span><small>{item.attempts || 0} lần thử · {dateTime(item.createdAt)}</small></div>)}</div></section></section>}
    {!loading && tab === 'audit' && <section className="admin-section"><section className="admin-card wide-card"><div className="card-kicker">Audit log</div><h2>Lịch sử thao tác</h2><div className="audit-list">{data.audit.map((entry) => <div key={entry.id}><span>{entry.action}</span><small>{entry.entityType} · {dateTime(entry.createdAt)}</small></div>)}</div></section></section>}
  </Suspense></main></PublicLayout>
}
const PaymentReviewQueue = lazy(() => import('../../components/admin/PaymentReviewQueue.jsx'))
