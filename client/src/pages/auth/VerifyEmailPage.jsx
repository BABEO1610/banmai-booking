import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import api from '../../services/api.js'

function readChallenge() {
  try { return JSON.parse(sessionStorage.getItem('banmai.challenge') || '{}') || {} } catch { return {} }
}

export default function VerifyEmailPage() {
  const [stored, setStored] = useState(readChallenge)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const navigate = useNavigate()
  const verify = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await api.verify({ challengeId: stored.challengeId, code }); sessionStorage.removeItem('banmai.challenge'); navigate('/login', { state: { verified: true } }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const resend = async () => {
    setResendBusy(true); setError(''); setMessage('')
    try {
      const next = await api.resend({ challengeId: stored.challengeId, email: stored.email })
      if (!next.challengeId) { setMessage('Email này đã được xác thực hoặc không còn yêu cầu xác thực đang chờ.'); return }
      const updated = { ...stored, ...next }
      setStored(updated); sessionStorage.setItem('banmai.challenge', JSON.stringify(updated)); setMessage('Đã gửi mã mới. Mã cũ không còn hiệu lực.')
    } catch (err) { setError(err.message) } finally { setResendBusy(false) }
  }
  return <PublicLayout><main className="auth-page single-auth"><div className="form-card"><p className="eyebrow"><span /> Xác thực tài khoản</p><h1>Email của bạn.<br /><em>Một bước nữa thôi.</em></h1>{!stored.challengeId ? <><p>Không có yêu cầu xác thực đang chờ. Vui lòng đăng ký trước để nhận mã.</p><Link className="primary-button" to="/register">Tạo tài khoản ↗</Link></> : <form onSubmit={verify} aria-busy={busy || resendBusy}><p>Nhập mã 6 số gửi tới <strong>{stored.email}</strong>.</p>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<label>Mã xác thực<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label><button className="primary-button" type="submit" disabled={busy || resendBusy}>{busy ? 'Đang xử lý…' : 'Xác thực email'} ↗</button><button className="secondary-button" type="button" disabled={busy || resendBusy} onClick={resend}>{resendBusy ? 'Đang gửi mã…' : 'Gửi lại mã'}</button></form>}<p className="form-switch"><Link to="/login">Quay lại đăng nhập</Link></p></div></main></PublicLayout>
}
