import { create } from 'zustand'

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  role: string
  plan: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isAuthenticated: false,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),
  clearAuth: () =>
    set({ user: null, accessToken: null, isAuthenticated: false }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
