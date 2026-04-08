'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/lib/store/authStore'

const PLAYER_ROLES = ['player', 'team_captain']

export default function Home() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    // Not logged in — send to login
    if (!Cookies.get('refresh_token')) {
      router.replace('/login')
      return
    }

    // Wait until auth store resolves
    if (isLoading) return

    if (user && PLAYER_ROLES.includes(user.role)) {
      router.replace('/player/dashboard')
    } else {
      router.replace('/dashboard')
    }
  }, [user, isLoading, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <span className="font-display text-3xl tracking-widest text-terra">
        ESPORTORIUM
      </span>
    </main>
  )
}
