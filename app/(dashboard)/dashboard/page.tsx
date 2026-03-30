'use client'

import Link from 'next/link'
import { Trophy, Plus, ShieldAlert } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/shared/PlanBadge'
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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? 'player'

  const isModeratorPlus = hasMinRole(role, 'moderator')
  const isOrganizerExact =
    hasMinRole(role, 'organizer') && !hasMinRole(role, 'moderator')

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="font-display text-3xl text-text-primary">
            Welcome back
            {user?.display_name ? `, ${user.display_name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Here&apos;s what&apos;s happening on your account.
          </p>
        </div>
        {user?.plan && <PlanBadge plan={user.plan} className="self-start mt-1" />}
      </div>

      {/* Role-aware CTA + placeholder section */}
      {isModeratorPlus ? (
        <ModeratorView />
      ) : isOrganizerExact ? (
        <OrganizerView />
      ) : (
        <PlayerView />
      )}
    </div>
  )
}

/* ─── Player / Team Captain view ─── */
function PlayerView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="col-span-full sm:col-span-1">
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Find a Tournament
          </h2>
          <p className="text-sm text-text-secondary">
            Browse open tournaments and register your team.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
          >
            <Link href="/dashboard/tournaments">
              <Trophy size={15} />
              Browse Tournaments
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Upcoming Matches
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            You have no upcoming matches scheduled.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Organizer view ─── */
function OrganizerView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="col-span-full sm:col-span-1">
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Host a Tournament
          </h2>
          <p className="text-sm text-text-secondary">
            Set up brackets, rules, and prize pools for your next event.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
          >
            <Link href="/dashboard/tournaments/new">
              <Plus size={15} />
              Create Tournament
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Active Tournaments
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            You have no active tournaments running.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Moderator / Admin view ─── */
function ModeratorView() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="col-span-full sm:col-span-1">
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Dispute Queue
          </h2>
          <p className="text-sm text-text-secondary">
            Review and resolve open match disputes.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
          >
            <Link href="/dashboard/disputes">
              <ShieldAlert size={15} />
              Open Disputes
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-display text-xl text-text-primary">
            Platform Stats
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Active Tournaments', value: '—' },
              { label: 'Registered Teams', value: '—' },
              { label: 'Open Disputes', value: '—' },
              { label: 'Total Players', value: '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <p className="text-xl font-bold text-text-primary">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
