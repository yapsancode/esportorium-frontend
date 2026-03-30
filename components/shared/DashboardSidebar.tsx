'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Trophy,
  Users,
  Plus,
  ShieldAlert,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/store/authStore'

const ROLE_ORDER = [
  'player',
  'team_captain',
  'organizer',
  'moderator',
  'admin',
  'super_admin',
] as const

function roleIndex(role: string) {
  const idx = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number])
  return idx === -1 ? 0 : idx
}

function hasMinRole(userRole: string, minRole: string) {
  return roleIndex(userRole) >= roleIndex(minRole)
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  minRole?: (typeof ROLE_ORDER)[number]
  maxRole?: (typeof ROLE_ORDER)[number]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tournaments', href: '/dashboard/tournaments', icon: Trophy },
  {
    label: 'My Team',
    href: '/dashboard/team',
    icon: Users,
    maxRole: 'team_captain',
  },
  {
    label: 'Create Tournament',
    href: '/dashboard/tournaments/create',
    icon: Plus,
    minRole: 'organizer',
  },
  {
    label: 'Disputes',
    href: '/dashboard/disputes',
    icon: ShieldAlert,
    minRole: 'moderator',
  },
  {
    label: 'Admin Panel',
    href: '/dashboard/admin',
    icon: Settings2,
    minRole: 'admin',
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const role = user?.role ?? 'player'
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center overflow-hidden border-b border-border px-3">
        {collapsed ? (
          <span className="font-display text-xl text-terra">E</span>
        ) : (
          <span className="font-display text-2xl uppercase tracking-wider text-terra">
            Esportorium
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const isGated = !!(item.minRole || item.maxRole)

          // While auth is loading: show skeleton for role-gated items
          if (isLoading && isGated) {
            return (
              <div
                key={item.href}
                className={cn(
                  'h-9 animate-pulse rounded-lg bg-surface-2',
                  collapsed ? 'w-8 self-center' : 'w-full',
                )}
              />
            )
          }

          // Auth resolved: apply role filter
          if (item.minRole && !hasMinRole(role, item.minRole)) return null
          if (item.maxRole && !hasMinRole(item.maxRole, role)) return null

          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-terra-subtle text-terra'
                  : 'text-text-secondary hover:bg-terra-subtle hover:text-terra',
              )}
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-terra-subtle hover:text-terra',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} className="shrink-0" />
          ) : (
            <>
              <PanelLeftClose size={16} className="shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
