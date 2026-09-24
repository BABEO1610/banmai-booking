import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import StudioIcon from './StudioIcon.jsx'
import StudioContact from './StudioContact.jsx'
import { ROLE_HOME } from '../../constants/auth.js'

export default function PublicLayout({ children, workspace = false }) {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const menuButton = useRef(null)
  const nav = useRef(null)
  useEffect(() => { setOpen(false) }, [pathname, search])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  useEffect(() => {
    const titles = { '/': 'Studio chụp ảnh', '/portfolio': 'Bộ ảnh', '/packages': 'Gói chụp', '/policy': 'Chính sách', '/login': 'Đăng nhập', '/register': 'Đăng ký', '/verify': 'Xác thực email', '/reset-password': 'Đặt lại mật khẩu', '/activate': 'Kích hoạt account', '/book': 'Đặt lịch', '/bookings': 'Booking của tôi', '/admin': 'Vận hành', '/photographer': 'Lịch Studio' }
    document.title = `${titles[pathname] || (pathname.endsWith('/payment') ? 'Thanh toán' : 'Không tìm thấy trang')} — Ban Mai`
  }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current.focus() }
      if (event.key === 'Tab') {
        const links = [menuButton.current, ...nav.current.querySelectorAll('a, button')]
        const next = links.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1)
        if (next < 0 || next >= links.length) { event.preventDefault(); links[next < 0 ? links.length - 1 : 0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const signOut = async () => {
    setBusy(true); setError('')
    try { await logout(); navigate('/') } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const accountPath = ROLE_HOME[user?.role] || '/'
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua menu, tới nội dung</a>
    <header className="header-wrap"><div className="app-header">
      <Link className="app-brand" to="/" aria-label="Ban Mai — Trang chủ"><span className="brand-aperture"><StudioIcon name="aperture" /></span>ban mai<span>.</span></Link>
      <button ref={menuButton} className="menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? 'Đóng' : 'Menu'}<StudioIcon name={open ? 'close' : 'menu'} /></button>
      <nav ref={nav} id="primary-navigation" aria-label="Điều hướng chính" className={open ? 'is-open' : ''}>
        <><NavLink to="/portfolio">Bộ ảnh</NavLink><NavLink to="/packages">Gói chụp</NavLink><NavLink to="/policy">Chính sách</NavLink>
        <a href="#studio-contact" onClick={(event) => { event.preventDefault(); setOpen(false); requestAnimationFrame(() => { const contact = document.getElementById('studio-contact'); if (contact) { contact.focus({ preventScroll: true }); contact.scrollIntoView({ behavior: 'instant', block: 'start' }) } else navigate('/#studio-contact') }) }}>Liên hệ</a></>
        {!loading && (user ? <><NavLink to={accountPath}>{user.role === 'ADMIN' ? 'Vận hành' : user.role === 'PHOTOGRAPHER' ? 'Lịch của tôi' : 'Booking của tôi'}</NavLink><button className="text-button" disabled={busy} onClick={signOut}>{busy ? 'Đang thoát…' : 'Đăng xuất'}</button></> : <NavLink to="/login">Đăng nhập</NavLink>)}
        <Link className="app-header-cta" to="/book">Đặt lịch <StudioIcon /></Link>
      </nav>
    </div></header>
    {error && <p className="form-error layout-error" role="alert">{error}</p>}
    <div id="main-content" tabIndex="-1">{children}</div>
    {!workspace && <footer className="app-footer"><StudioContact /><div className="footer-top"><Link className="app-brand" to="/">ban mai<span>.</span></Link><p>Những khung hình có bạn.<br />Những câu chuyện còn ở lại.</p><Link className="under-link" to="/book">Hẹn một buổi chụp ↗</Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Ban Mai Studio</span><span>Lưu giữ những khoảnh khắc của bạn.</span></div></footer>}
  </div>
}
