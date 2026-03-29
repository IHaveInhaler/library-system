import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/auth'

export function useAuth() {
  return useAuthStore()
}

export function useMe() {
  const { accessToken } = useAuthStore()
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: any) => {
      // If 2FA is required, don't set auth — the LoginPage handles the challenge flow
      if (data.requires2FA) return
      setAuth(data.user, data.accessToken, data.refreshToken)
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: any) => {
      // Only set auth if we got tokens (not pending email/approval)
      if (data.accessToken) {
        setAuth(data.user, data.accessToken, data.refreshToken)
      }
    },
  })
}

export function useLogout() {
  const { clearAuth } = useAuthStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const rt = localStorage.getItem('refreshToken')
      if (rt) await authApi.logout(rt)
    },
    onSettled: () => {
      clearAuth()
      qc.clear()
    },
  })
}

export function useRole() {
  const user = useAuthStore((s) => s.user)
  return {
    role: user?.role ?? null,
    isAdmin: user?.role === 'ADMIN',
    isLibrarian: user?.role === 'LIBRARIAN' || user?.role === 'ADMIN',
    isMember: !!user,
  }
}
