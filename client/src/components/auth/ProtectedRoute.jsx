import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { SessionLoading } from '../Feedback.jsx'
import { validRoles } from '../../constants/auth.js'
import ForbiddenPage from '../../pages/public/ForbiddenPage.jsx'

export default function ProtectedRoute({ roles = validRoles, children }) {
  const { user, loading } = useAuth()
  if (loading) return <SessionLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <ForbiddenPage />
  return children
}
