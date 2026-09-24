import { useEffect, useState } from 'react'
import api from '../../services/api.js'

export default function HomeContentEditor({ content, csrf, onDone, onError }) {
  const [form, setForm] = useState({ title: '', body: '', image: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm({ title: content?.title || '', body: content?.body || '', image: content?.image || '/images/daylight.jpg' }); setPreview(''); setFile(null) }, [content])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  if (!content) return <section className="admin-card wide-card admin-content-editor"><h2>Ảnh trang chủ chưa được cấu hình</h2><p className="muted-note">Hãy tạo nội dung home_intro trong dữ liệu catalog trước khi chỉnh sửa.</p></section>
  const save = async (event) => { event.preventDefault(); setBusy(true); try { let next = content; if (file) next = await api.uploadContentImage(content.id, file, content.version, csrf); await api.updateContent(content.id, { title: form.title, body: form.body, image: next.image, version: next.version }, csrf); onDone?.(); } catch (error) { onError?.(error) } finally { setBusy(false) } }
  return <form className="admin-card wide-card admin-content-editor" onSubmit={save}><div className="card-kicker">Trang chủ</div><h2>Ảnh mở đầu và lời giới thiệu</h2><p>Thay ảnh hero hiển thị ngay khi khách mở trang. Ảnh được tối ưu thành WebP ở máy chủ.</p><div className="two-fields"><label>Tiêu đề<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength="160" required /></label><label>Ảnh hero<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const selected = e.target.files?.[0] || null; setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : '') }} /></label></div><label>Mô tả<textarea rows="4" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength="2000" /></label><img className="admin-content-preview" src={preview || form.image} alt="Xem trước ảnh trang chủ" /><button className="primary-button" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button><small className="muted-note">Phiên bản {content.version}</small></form>
}
