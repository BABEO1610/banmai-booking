import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { packages } from '../../data/showcase.js'
import { ArrowIcon, ApertureIcon } from './Icons.jsx'

export default function BookingPreview({ open, onClose, initialPackage, reduced }) {
  const dialog = useRef(null)
  const titleId = useId(); const descriptionId = useId()
  const [packageId, setPackageId] = useState(initialPackage)
  const [date, setDate] = useState('')
  const [summary, setSummary] = useState(false)
  const pkg = packages.find((item) => item.id === packageId) || packages[0]
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  useEffect(() => {
    if (open) { setPackageId(initialPackage); setDate(''); setSummary(false); if (!dialog.current.open) dialog.current.showModal() }
  }, [open, initialPackage])
  return <dialog ref={dialog} className="booking-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <AnimatePresence onExitComplete={() => { if (!open) dialog.current?.close() }}>
      {open && <motion.div className="booking-panel" initial={reduced ? false : { opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 16 }} transition={{ duration: reduced ? 0 : 0.24 }}>
        <button className="dialog-close" aria-label="Đóng bản thử đặt lịch" onClick={onClose}>×</button><span className="dialog-aperture"><ApertureIcon /></span><p className="section-note">Một buổi chụp dành cho bạn</p><h2 id={titleId}>{summary ? 'Lựa chọn của bạn.' : 'Bắt đầu từ một ngày đẹp.'}</h2><p id={descriptionId} className="dialog-description">Bản thử tương tác giao diện. Chưa kiểm tra lịch trống, tạo booking hoặc thu tiền cọc.</p>
        <AnimatePresence mode="wait" initial={false}>
          {!summary ? <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.15 }} onSubmit={(event) => { event.preventDefault(); setSummary(true) }}>
            <fieldset className="package-picker"><legend>Chọn gói chụp</legend>{packages.map((item) => <label key={item.id} className={packageId === item.id ? 'selected' : ''}><input type="radio" name="shoot-package" value={item.id} checked={packageId === item.id} onChange={() => setPackageId(item.id)} /><span><strong>{item.name}</strong><small>{item.timeLabel}</small></span><span className="radio-mark" /></label>)}</fieldset><label className="date-field">Ngày bạn muốn chụp<input type="date" value={date} min={today} required onChange={(event) => setDate(event.target.value)} /></label><div className="booking-mini-summary"><span>Khung giờ</span><strong>{pkg.hours}</strong><span>Cọc theo yêu cầu</span><strong>500.000đ</strong></div><button className="button dialog-submit" type="submit">Xem bản tóm tắt <ArrowIcon /></button>
          </motion.form> : <motion.div key="summary" className="preview-summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.15 }}><div className="summary-check" aria-hidden="true">✓</div><p role="status">Bạn đã thử xong bước chọn buổi chụp.</p><dl><div><dt>Gói chụp</dt><dd>{pkg.name}</dd></div><div><dt>Ngày dự kiến</dt><dd>{new Intl.DateTimeFormat('vi-VN').format(new Date(`${date}T12:00:00`))}</dd></div><div><dt>Khung giờ</dt><dd>{pkg.hours}</dd></div></dl><p className="summary-disclaimer">Lựa chọn chỉ tồn tại trên trang này. Chưa có lịch được giữ hoặc thanh toán được xác nhận.</p><div className="summary-actions"><button className="button button-light" onClick={() => setSummary(false)}>Chọn lại</button><button className="button" onClick={onClose}>Hoàn tất bản thử</button></div></motion.div>}
        </AnimatePresence>
      </motion.div>}
    </AnimatePresence>
  </dialog>
}
