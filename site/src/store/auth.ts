import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken)
    set({ user, accessToken })
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken)
    set({ accessToken })
  },

  clearAuth: () => {
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null })
  },
}))
