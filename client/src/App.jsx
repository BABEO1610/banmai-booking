import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
const HomePage = lazy(() => import('./pages/public/HomePage.jsx'))
const PackagesPage = lazy(() => import('./pages/public/PackagesPage.jsx'))
const PortfolioPage = lazy(() => import('./pages/public/PortfolioPage.jsx'))
const PolicyPage = lazy(() => import('./pages/public/PolicyPage.jsx'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage.jsx'))
const ActivateAccountPage = lazy(() => import('./pages/auth/ActivateAccountPage.jsx'))
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
const ForbiddenPage = lazy(() => import('./pages/public/ForbiddenPage.jsx'))
const BookingPage = lazy(() => import('./pages/customer/BookingPage.jsx'))
const BookingsPage = lazy(() => import('./pages/customer/BookingsPage.jsx'))
const PaymentPage = lazy(() => import('./pages/customer/PaymentPage.jsx'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'))
const CalendarPage = lazy(() => import('./pages/photographer/CalendarPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage.jsx'))
function RouteFocus() {
  const { pathname } = useLocation()
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    const frame = requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [pathname])
  return null
}

export default function App() {
  return <AuthProvider><BrowserRouter><Suspense fallback={<main id="route-loading" className="simple-page" role="status">Đang mở trang…</main>}><RouteFocus /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/packages" element={<PackagesPage />} />
    <Route path="/portfolio" element={<PortfolioPage />} />
    <Route path="/policy" element={<PolicyPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/verify" element={<VerifyEmailPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/activate" element={<ActivateAccountPage />} />
    <Route path="/book" element={<ProtectedRoute roles={['CUSTOMER']}><BookingPage /></ProtectedRoute>} />
    <Route path="/bookings" element={<ProtectedRoute roles={['CUSTOMER']}><BookingsPage /></ProtectedRoute>} />
    <Route path="/bookings/:id/payment" element={<ProtectedRoute roles={['CUSTOMER']}><PaymentPage /></ProtectedRoute>} />
    <Route path="/admin/*" element={<ProtectedRoute roles={['ADMIN']}><AdminPage /></ProtectedRoute>} />
    <Route path="/photographer/*" element={<ProtectedRoute roles={['PHOTOGRAPHER']}><CalendarPage /></ProtectedRoute>} />
    <Route path="/forbidden" element={<ForbiddenPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></BrowserRouter></AuthProvider>
}
