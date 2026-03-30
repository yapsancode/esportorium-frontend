import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/lib/store/authStore'

const api = axios.create({
  baseURL: 'http://localhost:8000',
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Track in-flight refresh to avoid parallel refresh calls
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    original._retry = true

    if (isRefreshing) {
      // Queue this request until the ongoing refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
        // Swallow the reject path — drainQueue will retry with new token
        void reject
      })
    }

    isRefreshing = true

    try {
      const refreshToken = Cookies.get('refresh_token')
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(
        'http://localhost:8000/auth/refresh',
        { refresh_token: refreshToken },
      )

      const newAccessToken: string = data.access_token
      const newRefreshToken: string | undefined = data.refresh_token

      // Update in-memory access token; keep existing user object
      useAuthStore.setState({ accessToken: newAccessToken, isAuthenticated: true })

      if (newRefreshToken) {
        Cookies.set('refresh_token', newRefreshToken, { sameSite: 'strict' })
      }

      drainQueue(newAccessToken)

      original.headers.Authorization = `Bearer ${newAccessToken}`
      return api(original)
    } catch {
      useAuthStore.getState().clearAuth()
      Cookies.remove('refresh_token')
      refreshQueue = []

      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }

      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default api

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tournament {
  id: string
  name: string
  game: string
  format: string
  status: string
  region: string
  max_teams: number
  start_date: string
  organizer: {
    id: string
    username: string
    display_name: string
  }
}

// ─── Tournament endpoints ─────────────────────────────────────────────────────

export async function getTournaments(): Promise<Tournament[]> {
  const { data } = await api.get<Tournament[] | { results: Tournament[] }>(
    '/tournaments',
  )
  return Array.isArray(data) ? data : data.results
}
