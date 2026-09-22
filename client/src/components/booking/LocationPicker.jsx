import { lazy, Suspense, useId, useRef, useState } from 'react'
import api from '../../services/api.js'
import './location-picker.css'

const LocationMap = lazy(() => import('./LocationMap.jsx'))
const mapsUrl = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
export default function LocationPicker({ value, onChange }) {
  const searchId = useId()
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [error, setError] = useState('')
  const [busy, setBusy] = useState(false), [searched, setSearched] = useState(false), [showMap, setShowMap] = useState(false)
  const sequence = useRef(0)
  const search = async () => {
    if (query.trim().length < 3) { setError('Nhập ít nhất 3 ký tự để tìm địa điểm.'); return }
    const current = ++sequence.current
    setBusy(true); setError(''); setResults([]); setSearched(false)
    try {
      const data = await api.request(`/locations/search?${new URLSearchParams({ q: query.trim() })}`)
      if (current === sequence.current) { setResults(data); setSearched(true) }
    } catch (err) { if (current === sequence.current) setError(err.message) }
    finally { if (current === sequence.current) setBusy(false) }
  }
  const choose = (place) => { onChange({ ...place, mapsUrl: mapsUrl(place.lat, place.lng), meetingNotes: value.meetingNotes || '' }); setResults([]); setSearched(false); setShowMap(true) }
  const pin = (lat, lng) => onChange({ ...value, source: 'pin', osmId: '', lat, lng, mapsUrl: mapsUrl(lat, lng) })
  const clear = () => onChange({ name: '', address: '', mapsUrl: '', meetingNotes: '', source: 'undecided', lat: null, lng: null, osmId: '' })
  const edit = (key, text) => onChange({ ...value, [key]: text, source: 'manual', lat: null, lng: null, osmId: '', mapsUrl: '' })
  return <section className="location-picker" aria-label="Chọn địa điểm chụp">
    <label className="field-label" htmlFor={searchId}>Tìm địa điểm tại Việt Nam</label>
    <div className="location-search-row">
      <input id={searchId} type="search" maxLength={150} placeholder="Ví dụ: Hồ Hoàn Kiếm, Hà Nội" value={query} onChange={(event) => { sequence.current++; setBusy(false); setQuery(event.target.value); setResults([]); setSearched(false); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search() } }} />
      <button type="button" className="secondary-button" disabled={busy} onClick={search}>{busy ? 'Đang tìm…' : 'Tìm kiếm'}</button>
    </div>
    <p className="location-hint">Tìm địa điểm công cộng qua OpenStreetMap. Không nhập thông tin cá nhân vào ô tìm kiếm; địa chỉ riêng có thể nhập thủ công bên dưới.</p>
    {error && <p role="alert" className="form-error">{error}</p>}
    {searched && !results.length && <p role="status">Không tìm thấy địa điểm. Thử thêm tên tỉnh/thành phố hoặc nhập địa chỉ thủ công.</p>}
    {results.length > 0 && <ul className="location-results" aria-label="Kết quả địa điểm">{results.map((place, index) => <li key={`${place.osmId}-${index}`}><button type="button" onClick={() => choose(place)}><strong>{place.name}</strong><span>{place.address}</span></button></li>)}</ul>}
    <p className="location-attribution">Dữ liệu © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></p>
    {!showMap && <button className="secondary-button" type="button" onClick={() => setShowMap(true)}>Mở bản đồ để chọn ghim</button>}
    {showMap && <Suspense fallback={<p role="status">Đang tải bản đồ…</p>}><LocationMap location={value} onSelect={pin} /></Suspense>}
    {(value.name || Number.isFinite(value.lat)) && <div className="location-selected" role="status"><strong>Điểm hẹn đã chọn: {value.name || 'Vị trí ghim'}</strong>{Number.isFinite(value.lat) && <small>{value.lat.toFixed(6)}, {value.lng.toFixed(6)} · {value.source === 'pin' ? 'Ghim đã chỉnh; kiểm tra lại địa chỉ' : 'Vị trí từ kết quả tìm kiếm'}</small>}{value.mapsUrl && <a href={value.mapsUrl} target="_blank" rel="noopener noreferrer">Mở vị trí trên bản đồ ↗</a>}<button type="button" className="secondary-button" onClick={clear}>Xóa địa điểm / trao đổi sau</button></div>}
    <label className="field-label">Tên địa điểm<input maxLength={250} value={value.name || ''} onChange={(e) => edit('name', e.target.value)} placeholder="Studio / địa điểm chụp" /></label>
    <label className="field-label">Địa chỉ<input maxLength={1000} value={value.address || ''} onChange={(e) => edit('address', e.target.value)} placeholder="Nhập thủ công nếu chưa tìm được trên bản đồ" /></label>
    <label className="field-label">Hướng dẫn đến điểm hẹn<textarea rows={2} maxLength={1000} value={value.meetingNotes || ''} onChange={(e) => onChange({ ...value, meetingNotes: e.target.value })} placeholder="Cổng vào, tầng, vị trí gặp…" /></label>
  </section>
}
