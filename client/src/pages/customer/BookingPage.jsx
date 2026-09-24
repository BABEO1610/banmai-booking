import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import api from '../../services/api.js'
import { LoadingState, SessionLoading } from '../../components/Feedback.jsx'
import LocationPicker from '../../components/booking/LocationPicker.jsx'
import PackagePicker from '../../components/booking/PackagePicker.jsx'

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN') + 'đ'

export default function BookingPage() {
  const { user, csrf, loading: authLoading } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [packages, setPackages] = useState([])
  const [packageId, setPackageId] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [contact, setContact] = useState({ name: user?.name || '', phone: '', facebook: '', peopleCount: 1 })
  const [location, setLocation] = useState({ name: '', address: '', mapsUrl: '' })
  const [notes, setNotes] = useState('')
  const [selectedOptions, setSelectedOptions] = useState([])
  const idempotencyKey = useRef(null)

  const selectedPackage = useMemo(() => packages.find((pkg) => pkg.id === packageId), [packages, packageId])
  const optionTotal = useMemo(() => selectedOptions.reduce((total, item) => total + Number(item.priceVnd || 0) * Number(item.quantity || 1), 0), [selectedOptions])

  useEffect(() => {
    if (selectedPackage?.peopleCount) setContact((current) => ({ ...current, peopleCount: selectedPackage.peopleCount }))
    setSelectedOptions([])
    idempotencyKey.current = null
  }, [selectedPackage])
  useEffect(() => { idempotencyKey.current = null }, [date])
  useEffect(() => {
    api.request('/packages').then((packages) => {
      const data = { packages }
      setPackages(data.packages)
      const requested = data.packages.find((pkg) => pkg.bookable && pkg.id === params.get('package'))
      setPackageId(requested?.id || data.packages.find((pkg) => pkg.bookable)?.id || '')
    }).catch((err) => setError(err.message)).finally(() => setCatalogLoading(false))
  }, [params])
  useEffect(() => { if (user?.name) setContact((current) => ({ ...current, name: current.name || user.name })) }, [user])

  const toggleOption = (group, choice) => {
    setSelectedOptions((current) => {
      if (current.some((item) => item.id === choice.id)) return current.filter((item) => item.id !== choice.id)
      if (group.type !== 'multi') return [...current.filter((item) => !group.choices.some((candidate) => candidate.id === item.id)), { id: choice.id, quantity: 1, priceVnd: choice.priceVnd }]
      const selectedInGroup = current.filter((item) => group.choices.some((candidate) => candidate.id === item.id)).length
      if (group.maxSelections && selectedInGroup >= group.maxSelections) return current
      return [...current, { id: choice.id, quantity: 1, priceVnd: choice.priceVnd }]
    })
  }

  if (authLoading) return <SessionLoading />
  if (!user) return <PublicLayout><main className="simple-page"><p className="eyebrow"><span /> Bắt đầu với một ngày đẹp</p><h1>Đăng nhập để<br /><em>giữ lịch của bạn.</em></h1><Link className="primary-button" to="/login">Đăng nhập <span>↗</span></Link></main></PublicLayout>

  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      idempotencyKey.current ||= `booking-${user.id}-${crypto.randomUUID()}`
      const booking = await api.createBooking({ packageId, packageVersion: selectedPackage.version, startAt: new Date(date + 'T07:00:00+07:00').toISOString(), contact, location, notes, selectedOptions }, csrf, idempotencyKey.current)
      navigate('/bookings/' + booking.id + '/payment')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return <PublicLayout><main className="booking-page">
    <div className="booking-heading"><p className="eyebrow"><span /> Chọn buổi chụp của bạn</p><h1>Một khoảng thời gian<br /><em>để giữ hình.</em></h1><p>Hold sẽ được giữ trong 15 phút sau khi tạo thành công. Bạn có thể thêm option trước khi xác nhận.</p></div>
    <form className="booking-card" onSubmit={submit}>
      <div className="step-label">01 / 03 <span>Gói và ngày</span></div>
      {catalogLoading && <LoadingState>Đang tải gói chụp…</LoadingState>}
      <PackagePicker packages={packages} value={packageId} onChange={setPackageId} />
      {selectedPackage?.optionGroups?.length > 0 && <fieldset className="booking-option-field"><legend>Thêm lựa chọn cho buổi chụp <small>Không bắt buộc</small></legend>{selectedPackage.optionGroups.map((group) => <div className="booking-option-group" key={group.id}><div className="booking-option-heading"><strong>{group.name}</strong><span>{group.required ? 'Bắt buộc' : 'Tùy chọn'}</span></div>{group.choices.filter((choice) => choice.active !== false).map((choice) => <label className="booking-option-choice" key={choice.id}><input type={group.type === 'multi' ? 'checkbox' : 'radio'} name={'option-' + group.id} checked={selectedOptions.some((item) => item.id === choice.id)} onChange={() => toggleOption(group, choice)} /><span>{choice.name}</span><b>{choice.priceVnd ? '+' + formatMoney(choice.priceVnd) : 'Đã gồm'}</b></label>)}</div>)}</fieldset>}
      <label className="field-label">Ngày muốn chụp<input type="date" min={today} value={date} required onChange={(e) => setDate(e.target.value)} /></label>
      <div className="booking-extra-fields"><div className="step-label">02 / 03 <span>Thông tin khách</span></div><label className="field-label">Họ tên<input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /></label><label className="field-label">Số điện thoại<input required inputMode="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label><label className="field-label">Link Facebook<input type="url" value={contact.facebook} onChange={(e) => setContact({ ...contact, facebook: e.target.value })} /></label><label className="field-label">Số người chụp<input type="number" min="1" readOnly={Boolean(selectedPackage?.peopleCount)} value={contact.peopleCount} onChange={(e) => setContact({ ...contact, peopleCount: e.target.value })} /></label></div>
      <div className="booking-extra-fields"><div className="step-label">03 / 03 <span>Địa điểm</span></div><LocationPicker value={location} onChange={setLocation} /><label className="field-label">Yêu cầu chụp<textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} /></label></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="booking-summary"><span><span>Cọc giữ lịch</span>{optionTotal > 0 && <small>Option thêm · {formatMoney(optionTotal)}</small>}</span><strong>500.000đ</strong><small>Hướng dẫn và phương thức xác nhận cọc hiển thị sau khi giữ lịch.</small></div>
      <button className="primary-button" disabled={loading || catalogLoading || !selectedPackage?.bookable} type="submit">{loading ? 'Đang kiểm tra lịch…' : 'Giữ lịch 15 phút'} <span>↗</span></button>
    </form>
  </main></PublicLayout>
}
