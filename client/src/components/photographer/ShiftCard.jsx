export default function ShiftCard({ shift }) {
  const location = shift.isMine ? shift.location : null
  const safeLink = location?.mapsUrl && /^https:\/\/(www\.)?(openstreetmap\.org|google\.com|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl)\//.test(location.mapsUrl)
  return <article className="shift-card"><div><span className="row-code">{shift.code}</span><strong>{shift.customerLabel}</strong><small>{new Date(shift.startAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })}</small>
    {location && <><p>{location.name || 'Địa điểm chưa chốt'} · {location.address || ''}</p>{safeLink && <a href={location.mapsUrl} target="_blank" rel="noopener noreferrer">Mở điểm hẹn trên bản đồ ↗</a>}{location.meetingNotes && <p>Điểm hẹn: {location.meetingNotes}</p>}</>}
    </div><span className={shift.isMine ? 'mine-mark' : 'unassigned-mark'}>{shift.isMine ? 'Ca của tôi' : shift.photographer || 'Chưa phân'}</span>{shift.isMine && <b>{Number(shift.payout.amount).toLocaleString('vi-VN')}đ</b>}</article>
}
