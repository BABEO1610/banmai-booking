import { useEffect, useRef, useState } from 'react'
import api from '../../services/api.js'
import { statusLabel } from '../../utils/statusLabels.js'
import './StudioCalendar.css'

const zone = 'Asia/Ho_Chi_Minh'
const dayKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
const time = value => new Date(value).toLocaleTimeString('vi-VN', { timeZone: zone, hour: '2-digit', minute: '2-digit' })
const dateKey = date => date.toISOString().slice(0, 10)
const shiftDay = (day, offset) => dateKey(new Date(Date.parse(`${day}T00:00:00Z`) + offset * 86400000))
const overlapsDay = (item, day) => new Date(item.startAt) < new Date(`${shiftDay(day, 1)}T00:00:00+07:00`) && new Date(item.endAt) > new Date(`${day}T00:00:00+07:00`)

export default function StudioCalendar({ csrf }) {
  const today = dayKey(new Date())
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selected, setSelected] = useState(today)
  const [bookings, setBookings] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ start: `${today}T07:00`, end: `${today}T17:00`, reason: '' })
  const generation = useRef(0)
  const refresh = async () => {
    const id = ++generation.current
    setLoading(true); setError('')
    const firstDay = `${month}-01`
    const from = `${shiftDay(firstDay, -7)}T00:00:00+07:00`
    const to = `${shiftDay(firstDay, 38)}T23:59:59+07:00`
    try {
      const [firstPage, rests] = await Promise.all([api.adminBookings({ from, to, overlap: 'true', pageSize: 100 }), api.blockedSchedules()])
      const items = [...firstPage.items]
      for (let page = 2; page <= firstPage.pages; page++) {
        if (id !== generation.current) return
        const next = await api.adminBookings({ from, to, overlap: 'true', pageSize: 100, page })
        items.push(...next.items)
      }
      if (id === generation.current) { setBookings(items.filter(item => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(item.status))); setBlocks(rests) }
    } catch (error) { if (id === generation.current) setError(error.message) }
    finally { if (id === generation.current) setLoading(false) }
  }
  useEffect(() => { refresh(); return () => { generation.current++ } }, [month])
  const choose = day => { setSelected(day); setMonth(day.slice(0, 7)); setShowForm(false); setMessage(''); setError(''); setForm({ start: `${day}T07:00`, end: `${day}T17:00`, reason: '' }) }
  const moveMonth = delta => { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + delta); choose(dateKey(d)) }
  const first = new Date(`${month}-01T00:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const days = Array.from({ length: Math.ceil((offset + last) / 7) * 7 }, (_, i) => shiftDay(`${month}-01`, i - offset))
  const dayBookings = bookings.filter(item => overlapsDay(item, selected)).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
  const dayBlocks = blocks.filter(item => overlapsDay(item, selected))
  const save = async event => {
    event.preventDefault(); setError(''); setMessage('')
    const start = new Date(`${form.start}:00+07:00`), end = new Date(`${form.end}:00+07:00`)
    if (!(start < end)) { setError('Thời gian kết thúc phải sau thời gian bắt đầu.'); return }
    setBusy(true)
    try { await api.block({ startAt: start.toISOString(), endAt: end.toISOString(), reason: form.reason.trim() }, csrf); await refresh(); setShowForm(false); setMessage('Đã lưu khoảng studio nghỉ.') } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const remove = async id => { setBusy(true); setError(''); try { await api.request(`/admin/blocked-schedules/${id}`, { method: 'DELETE', headers: { 'x-csrf-token': csrf } }); await refresh(); setMessage('Đã mở lại khoảng lịch.') } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const monthBookings = bookings.filter(item => days.some(day => day.startsWith(month) && overlapsDay(item, day))).length
  return <section className="studio-calendar">
    <header className="sc-heading"><div><p>Lịch vận hành · Giờ Việt Nam</p><h2>Mỗi ngày, một câu chuyện.</h2></div><span>{monthBookings} ca trong tháng</span></header>
    <div className="sc-layout"><div className="sc-month">
      <div className="sc-toolbar"><h3>Tháng {Number(month.slice(5))} <span>{month.slice(0, 4)}</span></h3><div><button type="button" onClick={() => choose(today)}>Hôm nay</button><button type="button" aria-label="Tháng trước" onClick={() => moveMonth(-1)}>‹</button><button type="button" aria-label="Tháng sau" onClick={() => moveMonth(1)}>›</button></div></div>
      <div className="sc-legend"><span className="sc-confirmed">Đã xác nhận</span><span className="sc-pending">Chờ cọc</span><span className="sc-completed">Hoàn tất</span><span className="sc-rest">Studio nghỉ</span></div>
      {loading ? <p role="status">Đang tải lịch studio…</p> : <><div className="sc-weekdays">{['T2','T3','T4','T5','T6','T7','CN'].map(day => <span key={day}>{day}</span>)}</div><div className="sc-days">{days.map(day => {
        const shifts = bookings.filter(item => overlapsDay(item, day)), rests = blocks.filter(item => overlapsDay(item, day))
        return <button type="button" key={day} className={`sc-day ${day === selected ? 'is-selected' : ''} ${day === today ? 'is-today' : ''} ${!day.startsWith(month) ? 'is-outside' : ''}`} aria-pressed={day === selected} aria-label={`${day}, ${shifts.length} ca chụp${rests.length ? ', có khoảng nghỉ' : ''}`} onClick={() => choose(day)}><span className="sc-day-number">{Number(day.slice(8))}</span><span className="sc-day-events">{shifts.slice(0, 2).map(item => <span className={`sc-event sc-${item.status.toLowerCase()}`} key={item.id}>{time(item.startAt)} <span>{item.assignment?.photographerName || 'Chưa phân thợ'}</span></span>)}{shifts.length > 2 && <span className="sc-more">+{shifts.length - 2} ca khác</span>}{rests.length > 0 && <span className="sc-event sc-rest">Studio nghỉ</span>}</span><span className="sc-mobile-count">{shifts.length > 0 ? `${shifts.length} ca` : ''}{rests.length > 0 && <i aria-hidden="true" />}</span></button>
      })}</div></>}
    </div><aside className="sc-detail" aria-label="Chi tiết ngày">
      <div className="sc-detail-date"><span>{new Date(`${selected}T12:00:00+07:00`).toLocaleDateString('vi-VN', { timeZone: zone, weekday: 'long' })}</span><h3>{selected.slice(8)}/{selected.slice(5, 7)} <small>{selected.slice(0, 4)}</small></h3><p>{dayBookings.length} ca chụp · {dayBlocks.length} khoảng nghỉ</p></div>
      <button className="sc-add" type="button" disabled={busy || loading} onClick={() => setShowForm(!showForm)} aria-expanded={showForm}>{showForm ? 'Đóng tùy chọn nghỉ' : '+ Thêm khoảng studio nghỉ'}</button>
      {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status" className="form-success">{message}</p>}
      {showForm && <form className="sc-rest-form" onSubmit={save}><div className="sc-presets">{[['Buổi sáng','07:00','12:00'],['Buổi chiều','14:00','17:00'],['Cả ngày','00:00','00:00']].map(([label,start,end]) => <button key={label} type="button" disabled={busy} onClick={() => setForm({ ...form, start: `${selected}T${start}`, end: `${label === 'Cả ngày' ? shiftDay(selected, 1) : selected}T${end}` })}>{label}</button>)}</div><label>Bắt đầu<input type="datetime-local" required value={form.start} disabled={busy} onChange={e => setForm({ ...form, start: e.target.value })} /></label><label>Kết thúc<input type="datetime-local" required value={form.end} disabled={busy} onChange={e => setForm({ ...form, end: e.target.value })} /></label><label>Lý do nghỉ<input required maxLength={200} value={form.reason} disabled={busy} placeholder="Nghỉ, bảo trì, sự kiện…" onChange={e => setForm({ ...form, reason: e.target.value })} /></label><button className="sc-add" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu khoảng nghỉ'}</button></form>}
      <div className="sc-agenda">{dayBlocks.map(block => <article className="sc-rest-item" key={block.id}><strong>{block.reason || 'Studio nghỉ'}</strong><p>{new Date(block.startAt).toLocaleString('vi-VN', { timeZone: zone })} – {new Date(block.endAt).toLocaleString('vi-VN', { timeZone: zone })}</p><button type="button" disabled={busy} onClick={() => remove(block.id)}>Mở lại lịch</button></article>)}{dayBookings.map(item => <article className="sc-shift" key={item.id}><div><strong>{time(item.startAt)} – {time(item.endAt)}</strong><span className={`sc-status sc-${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span></div><h4>{item.assignment?.photographerName || 'Chưa phân thợ'}</h4><p>{item.contact?.name || 'Khách hàng'} · {item.package?.name}</p><small>{item.code}</small>{item.location?.name && <p>{item.location.name}</p>}</article>)}{!loading && !dayBookings.length && !dayBlocks.length && <div className="sc-empty"><span aria-hidden="true">☼</span><h4>Một ngày còn trống</h4><p>Chưa có ca chụp hoặc khoảng nghỉ trong ngày này.</p></div>}</div>
    </aside></div>
  </section>
}
