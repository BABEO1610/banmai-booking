import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../../components/public/PublicLayout.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const data = await register(form)
      sessionStorage.setItem('banmai.challenge', JSON.stringify({ ...data, email: form.email }))
      navigate('/verify')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <PublicLayout><main className="auth-page"><div className="auth-copy"><p className="eyebrow"><span /> Một tài khoản của riêng bạn</p><h1>Giữ lại<br /><em>một ngày đẹp.</em></h1><p>Mã xác thực sẽ được gửi tới email của bạn. Bạn cần nhập đúng mã trước khi đăng nhập.</p></div><form className="form-card" onSubmit={submit} aria-busy={busy}><h2>Tạo tài khoản</h2>{error && <p className="form-error" role="alert">{error}</p>}<label>Tên hiển thị<input autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><PasswordField label="Mật khẩu" autoComplete="new-password" minLength="12" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><p className="muted-note">Mật khẩu tối thiểu 12 ký tự.</p><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Đang gửi mã…' : 'Gửi mã xác thực'} <span aria-hidden="true">↗</span></button><p className="form-switch">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p></form></main></PublicLayout>
}
