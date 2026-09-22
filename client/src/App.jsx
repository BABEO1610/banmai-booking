import { useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import HomePage from './pages/public/HomePage.jsx'
import PackagesPage from './pages/public/PackagesPage.jsx'
import PortfolioPage from './pages/public/PortfolioPage.jsx'
import PolicyPage from './pages/public/PolicyPage.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import VerifyEmailPage from './pages/auth/VerifyEmailPage.jsx'
import ResetPasswordPage from './pages/auth/ResetPasswordPage.jsx'
import ActivateAccountPage from './pages/auth/ActivateAccountPage.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import ForbiddenPage from './pages/public/ForbiddenPage.jsx'
import BookingPage from './pages/customer/BookingPage.jsx'
import BookingsPage from './pages/customer/BookingsPage.jsx'
import PaymentPage from './pages/customer/PaymentPage.jsx'
import AdminPage from './pages/admin/AdminPage.jsx'
import CalendarPage from './pages/photographer/CalendarPage.jsx'
import NotFoundPage from './pages/public/NotFoundPage.jsx'
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
  return <AuthProvider><BrowserRouter><RouteFocus /><Routes>
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
  </Routes></BrowserRouter></AuthProvider>
}
