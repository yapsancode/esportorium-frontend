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

      // Restore user if the refresh response includes it (covers mid-session token rotation)
      if (data.user) {
        useAuthStore.getState().setAuth(data.user, newAccessToken)
      } else {
        useAuthStore.setState({ accessToken: newAccessToken, isAuthenticated: true })
      }

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

export interface OrganizerBasic {
  id: string
  username: string
  display_name: string | null
}

export interface Tournament {
  id: string
  name: string
  description: string | null
  game: string
  region: string | null
  format: string
  match_format: string
  status: string
  max_teams: number
  prize_pool: number | null
  start_date: string | null
  end_date: string | null
  organizer_id: string
  organizer: OrganizerBasic
  created_at: string
  updated_at: string
  tournament_type: string
  venue_name: string | null
  venue_address: string | null
}

// ─── Tournament endpoints ─────────────────────────────────────────────────────

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export async function getMe(): Promise<import('@/lib/store/authStore').User> {
  const { data } = await api.get('/auth/me')
  return data
}

// ─── Tournament endpoints ─────────────────────────────────────────────────────

export async function getTournaments(): Promise<Tournament[]> {
  const { data } = await api.get<Tournament[] | { results: Tournament[] }>(
    '/tournaments',
  )
  return Array.isArray(data) ? data : data.results
}

export interface CreateTournamentPayload {
  name: string
  game: string
  region: string
  description?: string
  tournament_type: string
  venue_name?: string
  venue_address?: string
  match_format: string
  max_teams: number
  start_date: string
  end_date: string
  prize_pool?: number
}

export async function createTournament(
  payload: CreateTournamentPayload,
): Promise<Tournament> {
  const { data } = await api.post<Tournament>('/tournaments', payload)
  return data
}

export async function getTournament(id: string): Promise<Tournament> {
  const { data } = await api.get<Tournament>(`/tournaments/${id}`)
  return data
}

export interface BracketMatch {
  id: string
  round: number
  match_number?: number
  participant_1: string | null
  participant_2: string | null
  score_1: number | null
  score_2: number | null
  status: string
  winner: string | null
}

export async function getTournamentBracket(id: string): Promise<BracketMatch[]> {
  const { data } = await api.get<BracketMatch[] | { matches: BracketMatch[] }>(
    `/tournaments/${id}/bracket`,
  )
  return Array.isArray(data) ? data : data.matches
}

export interface Registration {
  id: string
  user_id: string
  tournament_id: string
  status: string
  registered_at: string
  user: {
    id: string
    username: string
    display_name: string | null
  }
}

export async function getTournamentRegistrations(
  id: string,
): Promise<Registration[]> {
  const { data } = await api.get<Registration[] | { results: Registration[] }>(
    `/tournaments/${id}/registrations`,
  )
  return Array.isArray(data) ? data : data.results
}

export async function registerForTournament(id: string): Promise<void> {
  await api.post(`/tournaments/${id}/register`)
}

export async function generateBracket(id: string): Promise<void> {
  await api.post(`/tournaments/${id}/bracket/generate`)
}
