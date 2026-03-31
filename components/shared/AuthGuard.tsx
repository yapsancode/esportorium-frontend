'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

/**
 * Client-side auth guard — second layer of protection after middleware.
 *
 * When the browser restores a cached dashboard page (e.g. via back button
 * after logout), middleware may not run immediately. This component fires
 * on mount and checks for the refresh_token cookie. If it's missing, the
 * user is redirected to /login before any protected content renders.
 */
export function AuthGuard() {
  const router = useRouter()

  useEffect(() => {
    if (!Cookies.get('refresh_token')) {
      router.replace('/login')
    }
  }, [router])

  // Re-check on bfcache restoration (Safari / mobile browsers).
  useEffect(() => {
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted && !Cookies.get('refresh_token')) {
        router.replace('/login')
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [router])

  return null
}
