import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api.js'

const emptyDraft = { id: '', name: '', description: '', mood: '', images: [], coverImage: '', version: 0, published: false, visible: false }

export default function PortfolioManager({ portfolio = [], csrf, onDone, onError }) {
  const [selectedId, setSelectedId] = useState(portfolio[0]?.id || '')
  const [draft, setDraft] = useState(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [files, setFiles] = useState([])
  const selected = useMemo(() => portfolio.find((item) => item.id === selectedId), [portfolio, selectedId])
  useEffect(() => { if (selected) setDraft({ ...selected, images: selected.images || [], coverImage: selected.coverImage || selected.image || '', mood: (selected.mood || []).join(', ') }) }, [selected])
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const save = async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const body = { name: draft.name, description: draft.description, mood: draft.mood.split(',').map((item) => item.trim()).filter(Boolean), coverImage: draft.coverImage, images: draft.images, version: draft.version }
      if (draft.id) await api.updatePortfolio(draft.id, body, csrf)
      else {
        const created = await api.createPortfolio(body, csrf)
        setSelectedId(created.id)
        setDraft({ ...created, images: created.images || [], coverImage: created.coverImage || '', mood: (created.mood || []).join(', ') })
        if (files.length) { await api.uploadPortfolioImages(created.id, files, created.version, csrf); setFiles([]) }
      }
      await onDone()
    } catch (error) { setFiles([]); await onDone(); onError(error) } finally { setBusy(false) }
  }
  const create = () => { setSelectedId(''); setDraft(emptyDraft); setFiles([]) }
  const upload = async () => {
    if (!draft.id || !files.length) return
    setBusy(true)
    try { await api.uploadPortfolioImages(draft.id, files, draft.version, csrf); setFiles([]); await onDone() } catch (error) { setFiles([]); await onDone(); onError(error) } finally { setBusy(false) }
  }
  const removeImage = (src) => setDraft((current) => ({ ...current, images: current.images.filter((image) => image.src !== src), coverImage: current.coverImage === src ? (current.images.find((image) => image.src !== src)?.src || '') : current.coverImage }))
  const moveImage = (index, direction) => setDraft((current) => { const images = [...current.images]; const next = index + direction; if (next < 0 || next >= images.length) return current; [images[index], images[next]] = [images[next], images[index]]; return { ...current, images } })
  return <section className="admin-card portfolio-manager">
    <div className="portfolio-manager-head"><div><div className="card-kicker">Portfolio</div><h2>Tùy chỉnh bộ ảnh</h2><p className="muted-note">Tạo bản nháp, thêm ảnh, chọn ảnh bìa rồi xuất bản cho trang khách.</p></div><button type="button" className="secondary-button" onClick={create}>Bộ ảnh mới</button></div>
    <div className="portfolio-manager-layout">
      <div className="portfolio-manager-list">{portfolio.length ? portfolio.map((item) => <button type="button" key={item.id} className={item.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><span>{item.published ? 'Đang xuất bản' : 'Bản nháp'} · {item.images?.length || 0} ảnh</span></button>) : <p className="muted-note">Chưa có bộ ảnh.</p>}</div>
      <form className="portfolio-manager-form" onSubmit={save}>
        <div className="portfolio-form-grid"><label>Mã bộ ảnh<input value={draft.id} disabled placeholder="Tự sinh khi tạo" /></label><label>Tên bộ ảnh<input required maxLength="120" value={draft.name} onChange={(event) => change('name', event.target.value)} /></label><label className="portfolio-form-wide">Mô tả<textarea rows="3" maxLength="1000" value={draft.description} onChange={(event) => change('description', event.target.value)} /></label><label>Phong cách <input value={draft.mood} onChange={(event) => change('mood', event.target.value)} placeholder="Chân dung, Ánh sáng mềm" /></label></div>
        <div className="portfolio-image-list"><div className="portfolio-section-heading"><h3>Ảnh trong bộ</h3><span>{draft.images.length} ảnh</span></div>{draft.images.length ? draft.images.map((image, index) => <div className="portfolio-image-row" key={image.id || image.src}><img src={image.src} alt={image.alt || draft.name} /><div><input aria-label={`Alt ảnh ${index + 1}`} value={image.alt || ''} onChange={(event) => change('images', draft.images.map((item) => item.id === image.id ? { ...item, alt: event.target.value } : item))} /><input aria-label={`Chú thích ảnh ${index + 1}`} value={image.caption || ''} onChange={(event) => change('images', draft.images.map((item) => item.id === image.id ? { ...item, caption: event.target.value } : item))} /></div><div className="portfolio-image-actions"><button type="button" onClick={() => change('coverImage', image.src)} aria-pressed={draft.coverImage === image.src}>{draft.coverImage === image.src ? 'Ảnh bìa' : 'Chọn bìa'}</button><button type="button" onClick={() => moveImage(index, -1)} disabled={!index}>↑</button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === draft.images.length - 1}>↓</button><button type="button" onClick={() => removeImage(image.src)}>Gỡ</button></div></div>) : <p className="muted-note">Chưa có ảnh. Chọn file rồi bấm lưu để tạo bộ và tải ảnh lên.</p>}</div>
        <div className="portfolio-upload"><label>Thêm ảnh (JPEG, PNG, WebP · tối đa 10MB/ảnh, tải lần lượt)<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 20))} /></label>{files.length > 0 && (draft.id ? <button type="button" className="secondary-button" disabled={busy} onClick={upload}>Tải {files.length} ảnh lên</button> : <small className="muted-note">{files.length} ảnh sẽ được tải lên sau khi tạo bản nháp.</small>)}</div>
        <div className="portfolio-publish-row"><button className="primary-button" disabled={busy}>{busy ? 'Đang lưu…' : draft.id ? 'Lưu thay đổi' : files.length ? 'Tạo bản nháp và tải ảnh' : 'Tạo bản nháp'}</button>{draft.id && <button type="button" className="secondary-button" disabled={busy || !draft.images.length || !draft.coverImage} onClick={async () => { setBusy(true); try { await api.publishPortfolio(draft.id, !draft.published, csrf); await onDone() } catch (error) { setFiles([]); await onDone(); onError(error) } finally { setBusy(false) } }}>{draft.published ? 'Ẩn khỏi trang khách' : 'Xuất bản bộ ảnh'}</button>}</div>
      </form>
    </div>
  </section>
}
