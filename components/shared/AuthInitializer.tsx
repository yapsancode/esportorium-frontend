'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import axios from 'axios'
import { useAuthStore, type User } from '@/lib/store/authStore'
import { getMe } from '@/lib/api'

/**
 * Mounts once in the dashboard layout. On every hard refresh or direct URL
 * load, Zustand (in-memory) resets to null even though the refresh_token
 * cookie is still valid. This component detects that state and silently
 * restores the user by exchanging the cookie for a fresh access token,
 * then fetching /auth/me.
 *
 * If the store already has a user (same-session navigation after login),
 * it just clears the loading flag and returns immediately — no network call.
 *
 * Also forces Zustand subscribers to re-render on every route change
 * (including browser back/forward) so role-based UI always reflects
 * the current auth state.
 */
export function AuthInitializer() {
  const pathname = usePathname()

  // Restore auth on hard refresh / direct URL load.
  useEffect(() => {
    const store = useAuthStore.getState()

    // Same-session navigation: store already populated by saveTokens() at login.
    if (store.user) {
      store.setLoading(false)
      return
    }

    const refreshToken = Cookies.get('refresh_token')
    if (!refreshToken) {
      // No cookie — middleware should have redirected, but clear state to be safe.
      store.setLoading(false)
      return
    }

    async function restore() {
      try {
        const { data } = await axios.post<{
          access_token: string
          refresh_token?: string
          user?: User
        }>('http://localhost:8000/auth/refresh', { refresh_token: refreshToken })

        const accessToken = data.access_token

        if (data.refresh_token) {
          Cookies.set('refresh_token', data.refresh_token, { sameSite: 'strict' })
        }

        // Prefer user object from refresh response; fall back to /auth/me.
        // Set the access token in the store first so the api interceptor can
        // attach it to the /auth/me request.
        useAuthStore.setState({ accessToken, isAuthenticated: true })
        const user: User = data.user ?? (await getMe())
        useAuthStore.getState().setAuth(user, accessToken)
      } catch {
        // Refresh token is invalid or expired — force re-login.
        Cookies.remove('refresh_token')
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      } finally {
        useAuthStore.getState().setLoading(false)
      }
    }

    restore()
  }, [])

  // On every route change (including back/forward navigation), create a new
  // user object reference so all Zustand selector subscribers re-render.
  // Next.js's router cache restores a stale React tree on back/forward and
  // may not trigger client component re-renders; this forces it.
  useEffect(() => {
    const { user } = useAuthStore.getState()
    if (user) {
      useAuthStore.setState({ user: { ...user } })
    }
  }, [pathname])

  // Handle browser-level bfcache restoration (page restored from frozen state).
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        const { user } = useAuthStore.getState()
        if (user) {
          useAuthStore.setState({ user: { ...user } })
        }
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  return null
}
