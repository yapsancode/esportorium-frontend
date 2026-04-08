'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/authStore'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/player/dashboard' },
  { label: 'Tournaments', href: '/player/tournaments' },
  { label: 'My Team', href: '/player/team' },
  { label: 'History', href: '/player/history' },
]

export function PlayerTopnav() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
      {/* Brand */}
      <Link href="/player/dashboard" className="mr-8">
        <span className="font-display text-2xl tracking-widest text-terra">
          ESPORTORIUM
        </span>
      </Link>

      {/* Center nav */}
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === '/player/dashboard'
              ? pathname === '/player/dashboard'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-terra-subtle text-terra'
                  : 'text-text-secondary hover:bg-terra-subtle hover:text-terra',
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User */}
      <div className="flex items-center gap-2">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.username}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full bg-terra text-xs font-bold text-white uppercase">
            {user?.username?.charAt(0) ?? '?'}
          </div>
        )}
        <span className="text-sm font-medium text-text-primary">
          {user?.username ?? '...'}
        </span>
      </div>
    </header>
  )
}
