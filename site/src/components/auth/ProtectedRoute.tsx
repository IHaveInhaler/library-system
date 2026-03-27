import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import type { Role } from '../../types'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, accessToken } = useAuthStore()
  const location = useLocation()

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
