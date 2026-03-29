import { Navigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../api/auth'
import type { Role } from '../../types'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: Role[]
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, accessToken } = useAuthStore()
  const location = useLocation()

  // Fetch fresh user data to check 2FA status
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!accessToken,
    staleTime: 30_000,
  })

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  // Wait for me query to resolve before rendering — prevents flash of protected content
  if (isLoading) {
    return null
  }

  // Force 2FA setup if required — redirect to /profile (but don't loop if already there)
  if (me?.requires2FASetup && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  return <>{children}</>
}
