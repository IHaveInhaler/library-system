import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '../store/auth'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, try refreshing — then retry the original request once
let refreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config!

    if (error.response?.status !== 401 || (original as any)._retry) {
      return Promise.reject(error)
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then((token) => {
        original.headers!.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    (original as any)._retry = true
    refreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post('/api/auth/refresh', { refreshToken })
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)

      queue.forEach(({ resolve }) => resolve(data.accessToken))
      queue = []

      original.headers!.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (err) {
      queue.forEach(({ reject }) => reject(err))
      queue = []
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      refreshing = false
    }
  }
)

export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? err.message
  }
  return 'An unexpected error occurred'
}
