import { useEffect, useState } from 'react'
import api from '../../services/api.js'

const labels = {
  home_intro: { title: 'Ảnh hero và lời giới thiệu', description: 'Ảnh hiển thị ngay khi khách mở trang chủ.' },
  home_light_main: { title: 'Ảnh nghiên cứu ánh sáng chính', description: 'Ảnh lớn ở bên trái trong khối “Nghiên cứu ánh sáng”.' },
  home_light_detail: { title: 'Ảnh nghiên cứu ánh sáng phụ', description: 'Ảnh nhỏ ở bên phải trong khối “Nghiên cứu ánh sáng”.' },
}

function ContentCard({ content, csrf, onDone, onError }) {
  const [form, setForm] = useState({ title: '', body: '', image: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const meta = labels[content.key] || { title: content.title || 'Nội dung trang chủ', description: 'Nội dung hiển thị trên trang chủ.' }

  useEffect(() => {
    setForm({ title: content?.title || '', body: content?.body || '', image: content?.image || '' })
    setPreview('')
    setFile(null)
  }, [content])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    try {
      let next = content
      if (file) next = await api.uploadContentImage(content.id, file, content.version, csrf)
      await api.updateContent(content.id, { title: form.title, body: form.body, image: next.image, version: next.version }, csrf)
      onDone?.()
    } catch (error) {
      onError?.(error)
    } finally {
      setBusy(false)
    }
  }

  return <form className="admin-card admin-content-editor" onSubmit={save}>
    <div className="card-kicker">Trang chủ · {content.key}</div>
    <h2>{meta.title}</h2>
    <p className="muted-note">{meta.description} Ảnh tải lên được tối ưu WebP ở máy chủ.</p>
    <div className="two-fields">
      <label>Tiêu đề<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength="160" required /></label>
      <label>Thay ảnh<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0] || null; setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : '') }} /></label>
    </div>
    <label>Mô tả nội bộ<textarea rows="3" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} maxLength="2000" /></label>
    <img className="admin-content-preview" src={preview || form.image} alt={`Xem trước ${meta.title}`} />
    <button className="primary-button" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ảnh này'}</button>
    <small className="muted-note">Phiên bản {content.version}</small>
  </form>
}

export default function HomeContentEditor({ contents = [], content, csrf, onDone, onError }) {
  const entries = contents.length ? contents : content ? [content] : []
  if (!entries.length) return <section className="admin-card wide-card admin-content-editor"><h2>Nội dung trang chủ chưa được cấu hình</h2><p className="muted-note">Hãy khởi động backend để tạo các nội dung mặc định cho trang chủ.</p></section>
  return <div className="admin-home-content-grid">{entries.map((entry) => <ContentCard key={entry.id || entry.key} content={entry} csrf={csrf} onDone={onDone} onError={onError} />)}</div>
}
