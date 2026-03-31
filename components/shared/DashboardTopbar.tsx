'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/shared/PlanBadge'
import { clearTokens } from '@/lib/auth'
import { useAuthStore } from '@/lib/store/authStore'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const ROLE_LABELS: Record<string, string> = {
  player: 'Player',
  team_captain: 'Captain',
  organizer: 'Organizer',
  moderator: 'Moderator',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export function DashboardTopbar() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  function handleLogout() {
    clearTokens()
    router.replace('/login')
  }

  const initial = user?.display_name
    ? user.display_name.charAt(0).toUpperCase()
    : '?'

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div />

      <div className="flex items-center gap-3">
        {isLoading ? (
          <div className="h-5 w-48 animate-pulse rounded-full bg-surface-2" />
        ) : (
          <>
            {user?.plan && <PlanBadge plan={user.plan} />}

            {user?.role && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-text-secondary">
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            )}

            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-terra text-xs font-bold text-primary-foreground">
                {initial}
              </div>
              <span className="text-sm font-medium text-text-primary">
                {user?.display_name ?? user?.username ?? ''}
              </span>
            </div>
          </>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log out"
              className="text-text-secondary hover:text-destructive"
            >
              <LogOut size={16} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-surface border-border text-text-primary">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription className="text-text-secondary">
                You will be redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-text-primary hover:bg-surface-2 hover:text-text-primary">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-terra text-white hover:bg-terra-dark"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}
