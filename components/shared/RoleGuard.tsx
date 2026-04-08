'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

const PLAYER_ROLES = ['player', 'team_captain']

export function RoleGuard({ allowed, redirectTo }: { allowed: string[]; redirectTo: string }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  useEffect(() => {
    if (isLoading) return
    if (!user || !allowed.includes(user.role)) {
      router.replace(redirectTo)
    }
  }, [user, isLoading, allowed, redirectTo, router])

  return null
}

export function PlayerRoleGuard() {
  return <RoleGuard allowed={PLAYER_ROLES} redirectTo="/dashboard" />
}
