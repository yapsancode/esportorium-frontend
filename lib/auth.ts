import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'
import { useAuthStore, User } from '@/lib/store/authStore'

interface TokenPayload {
  user_id: string
  role: string
  plan: string
}

/**
 * Persist tokens and sync the auth store.
 * The full user object comes from the API response (not the token),
 * so callers must supply it alongside the tokens.
 */
export function saveTokens(
  user: User,
  accessToken: string,
  refreshToken: string,
): void {
  Cookies.set('refresh_token', refreshToken, { sameSite: 'strict' })
  useAuthStore.getState().setAuth(user, accessToken)
}

/** Remove the refresh-token cookie and wipe the auth store. */
export function clearTokens(): void {
  Cookies.remove('refresh_token')
  useAuthStore.getState().clearAuth()
}

/** Read the current access token from the in-memory store. */
export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken
}

/** Decode a JWT and return its role/plan claims. */
export function decodeToken(token: string): TokenPayload {
  return jwtDecode<TokenPayload>(token)
}
