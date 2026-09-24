import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { ROLE_HOME } from '../../constants/auth.js'
import PasswordField from '../../components/auth/PasswordField.jsx'
import api from '../../services/api.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [resendMessage, setResendMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError(''); setErrorCode(''); setResendMessage(''); setBusy(true)
    try {
      const user = await login(form)
      if (!ROLE_HOME[user.role]) throw new Error('Role tài khoản không được hỗ trợ')
      navigate(ROLE_HOME[user.role], { replace: true })
    } catch (err) { setError(err.message); setErrorCode(err.code || '') } finally { setBusy(false) }
  }
  const resendVerification = async () => {
    setResendBusy(true); setError(''); setResendMessage('')
    try {
      const next = await api.resend({ email: form.email, purpose: 'EMAIL_VERIFY' })
      if (!next.challengeId) throw new Error('Tài khoản này không còn yêu cầu xác thực đang chờ.')
      sessionStorage.setItem('banmai.challenge', JSON.stringify({ ...next, email: form.email }))
      navigate('/verify')
    } catch (err) { setResendMessage(err.message) } finally { setResendBusy(false) }
  }
  return <PublicLayout><main className="auth-page"><div className="auth-copy"><p className="eyebrow"><span /> Hẹn một buổi ở Ban Mai</p><h1>Chào bạn,<br /><em>mình bắt đầu nhé.</em></h1><p>Đăng nhập để chọn buổi chụp và giữ lịch trong 15 phút.</p></div><form className="form-card" onSubmit={submit} aria-busy={busy || resendBusy}><h2>Đăng nhập</h2>{error && <p className="form-error" role="alert">{error}</p>}{resendMessage && <p className="form-error" role="alert">{resendMessage}</p>}<label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><PasswordField label="Mật khẩu" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Link className="forgot-link" to="/reset-password">Quên mật khẩu?</Link>{errorCode === 'EMAIL_NOT_VERIFIED' && <button className="secondary-button resend-login-button" type="button" disabled={busy || resendBusy} onClick={resendVerification}>{resendBusy ? 'Đang gửi mã…' : 'Gửi lại mã xác thực'}</button>}<button className="primary-button" type="submit" disabled={busy || resendBusy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'} <span aria-hidden="true">↗</span></button><p className="form-switch">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p></form></main></PublicLayout>
}
