import { useState } from 'react'
import api from '../../services/api.js'

export default function AccountManagement({ users, csrf, onDone }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'PHOTOGRAPHER' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await api.createUser(form, csrf); setForm({ name: '', email: '', role: 'PHOTOGRAPHER' }); await onDone() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const update = async (user, patch) => {
    setBusy(true); setError('')
    try { await api.updateUser(user.id, patch, csrf); await onDone() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <section className="admin-card wide-card"><div className="card-kicker">05 · Tài khoản nội bộ</div><h2>Admin và Photographer</h2><p>Account mới nhận mã kích hoạt qua email. Không đặt mật khẩu thay người nhận.</p>{error && <p className="form-error" role="alert">{error}</p>}<form className="two-fields" onSubmit={create}><label>Tên<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="PHOTOGRAPHER">Photographer</option><option value="ADMIN">Admin</option></select></label><button className="primary-button" type="submit" disabled={busy}>Tạo account ↗</button></form><div className="data-list">{users.map((user) => <div className="data-row" key={user.id}><div><span className="row-code">{user.role}</span><strong>{user.name}</strong><small>{user.email} · {user.status} · {user.emailVerified ? 'Đã xác thực' : 'Chờ kích hoạt'}</small></div><div className="row-right"><button className="small-action" disabled={busy || user.status === 'PENDING'} onClick={() => update(user, { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}</button>{user.role === 'ADMIN' ? <button className="small-action" disabled={busy} onClick={() => update(user, { role: 'PHOTOGRAPHER' })}>Hạ role</button> : <button className="small-action" disabled={busy} onClick={() => update(user, { role: 'ADMIN' })}>Nâng Admin</button>}</div></div>)}</div></section>
}
