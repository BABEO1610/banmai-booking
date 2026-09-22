import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import api from '../../services/api.js'
import PasswordField from '../../components/auth/PasswordField.jsx'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [requested, setRequested] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const request = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { const data = await api.resetRequest(email); setRequested(true); setMessage(data.message) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const resend = async () => {
    setResendBusy(true); setError(''); setMessage('')
    try { await api.resend({ email, purpose: 'PASSWORD_RESET' }); setMessage('Đã gửi lại mã đặt lại mật khẩu. Mã trước đó không còn hiệu lực.') }
    catch (err) { setError(err.message) } finally { setResendBusy(false) }
  }
  const reset = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await api.reset({ email, code, newPassword: password }); setMessage('Đã đổi mật khẩu. Bạn có thể đăng nhập với mật khẩu mới.'); setRequested(false); setCode(''); setPassword('') }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <PublicLayout><main className="auth-page single-auth"><div className="form-card"><p className="eyebrow"><span /> Khôi phục quyền truy cập</p><h1>Đặt lại<br /><em>mật khẩu.</em></h1>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<form onSubmit={request}><label>Email<input type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setRequested(false); setMessage('') }} /></label><button className="secondary-button" type="submit" disabled={busy || resendBusy}>{busy ? 'Đang xử lý…' : 'Gửi mã đặt lại'}</button></form>{requested && <form onSubmit={reset}><p className="muted-note">Kiểm tra Inbox/Spam rồi nhập mã 6 số. Vì lý do bảo mật, email không tồn tại cũng nhận thông báo giống nhau.</p><label>Mã xác thực<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></label><PasswordField label="Mật khẩu mới" autoComplete="new-password" minLength="12" required value={password} onChange={(e) => setPassword(e.target.value)} /><button className="primary-button" type="submit" disabled={busy || resendBusy}>Đổi mật khẩu ↗</button><button className="secondary-button" type="button" disabled={busy || resendBusy} onClick={resend}>{resendBusy ? 'Đang gửi mã…' : 'Gửi lại mã'}</button></form>}<p className="form-switch"><Link to="/login">Quay lại đăng nhập</Link></p></div></main></PublicLayout>
}
