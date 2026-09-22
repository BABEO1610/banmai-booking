import { useEffect, useState } from 'react'
import { socialUrl } from '../../data/studioContact.js'
import StudioIcon from './StudioIcon.jsx'

const channels = [
  { id: 'zalo', name: 'Zalo', label: 'Nhắn tin qua Zalo', note: 'Trao đổi ý tưởng, chọn concept và hỏi lịch chụp.' },
  { id: 'facebook', name: 'Facebook', label: 'Ghé Facebook Studio', note: 'Tìm hiểu thêm về Studio và gửi lời nhắn cho chúng mình.' },
]
export default function StudioContact() {
  const [links, setLinks] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    fetch('/studio-contact.json', { signal: abort.signal, cache: 'no-store' })
      .then((response) => { if (!response.ok) throw new Error('Contact unavailable'); return response.json() })
      .then((data) => { if (!abort.signal.aborted) setLinks({ zalo: socialUrl('zalo', data?.zalo), facebook: socialUrl('facebook', data?.facebook) }) })
      .catch(() => { if (!abort.signal.aborted) { setFailed(true); setLinks({}) } })
    return () => abort.abort()
  }, [])
  return <section id="studio-contact" className="studio-contact" tabIndex="-1" aria-labelledby="contact-title">
    <div className="contact-intro"><p className="section-kicker">CHĂM SÓC KHÁCH HÀNG</p><h2 id="contact-title">Một lời nhắn.<br /><em>Bắt đầu câu chuyện của bạn.</em></h2><p>Chưa biết chọn concept nào, cần tư vấn gói chụp hay hỗ trợ booking? Hãy trò chuyện với Ban Mai trước nhé.</p></div>
    <div className="contact-channels">{channels.map((channel) => <div className="contact-channel" key={channel.id}>
      <div className="contact-channel-heading"><StudioIcon name="message" /><h3>{channel.name}</h3></div><p>{channel.note}</p>
      {links?.[channel.id] ? <a href={links[channel.id]} target="_blank" rel="noopener noreferrer" className="contact-link">{channel.label}<StudioIcon name="external" /><span className="sr-only"> (mở trong tab mới)</span></a> : <span className="contact-unavailable">{links === null ? 'Đang tải kênh liên hệ…' : failed ? 'Kênh liên hệ tạm thời chưa khả dụng' : 'Studio chưa cập nhật link liên hệ'}</span>}
    </div>)}<p className="contact-privacy">Liên kết mở trực tiếp trên Zalo hoặc Facebook. Trang không nhúng widget theo dõi hay yêu cầu quyền truy cập tài khoản.</p></div>
  </section>
}
