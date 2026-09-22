import { useState } from 'react'
import api from '../../services/api.js'

export default function PackageImageInput({ value, onChange, csrf, disabled, onBusy }) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const upload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Chọn ảnh JPEG, PNG hoặc WebP, tối đa 10MB.'); return
    }
    setUploading(true); onBusy(true)
    try {
      const form = new FormData(); form.append('image', file)
      const result = await api.request('/admin/catalog/packages/image', { method: 'POST', headers: { 'x-csrf-token': csrf }, body: form })
      onChange(result.image)
    } catch (err) { setError(err.message) } finally { setUploading(false); onBusy(false) }
  }
  return <div className="catalog-form-wide">
    <label>Ảnh đại diện<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={upload} /></label>
    <p style={{ fontSize: 13, margin: '8px 0' }} role="status">{uploading ? 'Đang tải ảnh…' : 'JPEG, PNG hoặc WebP · Tối đa 10MB. Bấm lưu gói để áp dụng ảnh.'}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {value && <img src={value} alt="Xem trước ảnh đại diện gói chụp" style={{ width: 220, maxWidth: '100%', height: 150, objectFit: 'cover', borderRadius: 10, display: 'block', margin: '12px 0' }} />}
    <details><summary style={{ cursor: 'pointer', padding: '10px 0' }}>Hoặc nhập đường dẫn ảnh</summary><label>Đường dẫn ảnh<input type="text" value={value || ''} disabled={disabled || uploading} onChange={event => onChange(event.target.value)} placeholder="/images/portrait-soft.jpg" /></label></details>
  </div>
}
