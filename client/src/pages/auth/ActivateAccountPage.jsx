import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import api from '../../services/api.js'
import PasswordField from '../../components/auth/PasswordField.jsx'

export default function ActivateAccountPage() {
  const [form, setForm] = useState({ email: '', code: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const navigate = useNavigate()
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try { await api.activate(form); navigate('/login', { state: { activated: true } }) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const resend = async () => {
    setResendBusy(true); setError(''); setMessage('')
    try { const next = await api.resend({ email: form.email, purpose: 'ACCOUNT_ACTIVATION' }); if (!next.challengeId) throw new Error('Tài khoản này không còn yêu cầu kích hoạt đang chờ.'); setMessage('Đã gửi lại mã kích hoạt. Mã trước đó không còn hiệu lực.'); setForm((current) => ({ ...current, code: '' })) }
    catch (err) { setError(err.message) } finally { setResendBusy(false) }
  }
  return <PublicLayout><main className="auth-page single-auth"><form className="form-card" onSubmit={submit} aria-busy={busy || resendBusy}><p className="eyebrow"><span /> Kích hoạt account</p><h1>Chào mừng<br /><em>về Studio.</em></h1>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<p>Nhập mã trong email Admin đã gửi, sau đó tự đặt mật khẩu của bạn.</p><label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Mã kích hoạt<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })} /></label><PasswordField label="Mật khẩu" autoComplete="new-password" minLength="12" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="primary-button" type="submit" disabled={busy || resendBusy}>{busy ? 'Đang kích hoạt…' : 'Kích hoạt account'} ↗</button><button className="secondary-button" type="button" disabled={busy || resendBusy} onClick={resend}>{resendBusy ? 'Đang gửi mã…' : 'Gửi lại mã kích hoạt'}</button><p className="form-switch"><Link to="/login">Quay lại đăng nhập</Link></p></form></main></PublicLayout>
}
