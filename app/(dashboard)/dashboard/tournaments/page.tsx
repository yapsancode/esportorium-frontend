'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Trophy, Plus, CalendarDays, Users, MapPin } from 'lucide-react'
import { getTournaments, type Tournament } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Role helper ─────────────────────────────────────────────────────────────

const ROLE_ORDER = [
  'player', 'team_captain', 'organizer',
  'moderator', 'admin', 'super_admin',
] as const

function roleIndex(role: string) {
  const idx = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number])
  return idx === -1 ? 0 : idx
}

function hasMinRole(userRole: string, minRole: string) {
  return roleIndex(userRole) >= roleIndex(minRole)
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-terra-subtle text-terra border-terra-border',
  ongoing: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-secondary text-text-secondary border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  draft: 'bg-surface text-text-secondary border-border',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Format label ─────────────────────────────────────────────────────────────

function formatLabel(format: string) {
  return format
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TournamentSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="h-5 w-2/3 rounded bg-surface-2" />
          <div className="h-5 w-16 rounded-full bg-surface-2" />
        </div>
        <div className="mt-1 h-3 w-1/3 rounded bg-surface-2" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="h-3 w-1/2 rounded bg-surface-2" />
        <div className="h-3 w-1/3 rounded bg-surface-2" />
        <div className="h-3 w-2/5 rounded bg-surface-2" />
      </CardContent>
    </Card>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <Trophy size={36} className="text-text-tertiary" />
      <p className="font-medium text-text-primary">
        {hasFilters ? 'No tournaments match your filters' : 'No tournaments yet'}
      </p>
      <p className="text-sm text-text-secondary">
        {hasFilters
          ? 'Try adjusting or clearing the filters.'
          : 'Be the first to create one.'}
      </p>
    </div>
  )
}

// ─── Tournament card ──────────────────────────────────────────────────────────

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const startDate = tournament.start_date
    ? new Date(tournament.start_date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : '—'

  return (
    <Link href={`/dashboard/tournaments/${tournament.id}`} className="group">
    <Card className="flex flex-col transition-shadow group-hover:shadow-md h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg leading-tight text-text-primary">
            {tournament.name}
          </h2>
          <StatusBadge status={tournament.status} />
        </div>
        <p className="text-sm text-text-secondary">{tournament.game}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {tournament.region}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} />
            {tournament.max_teams} teams max
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {startDate}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Badge variant="outline" className="text-xs">
            {formatLabel(tournament.format)}
          </Badge>
        </div>

        <p className="mt-auto pt-2 text-xs text-text-tertiary">
          by {tournament.organizer.display_name ?? tournament.organizer.username}
        </p>
      </CardContent>
    </Card>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL = 'all'

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState(ALL)
  const [regionFilter, setRegionFilter] = useState(ALL)
  const [formatFilter, setFormatFilter] = useState(ALL)

  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const canCreate = hasMinRole(user?.role ?? '', 'organizer')

  useEffect(() => {
    getTournaments()
      .then(setTournaments)
      .catch(() => setError('Failed to load tournaments.'))
      .finally(() => setLoading(false))
  }, [])

  // Derive unique filter options from the data
  const regions = useMemo(
    () =>
      [...new Set(tournaments.map((t) => t.region).filter((r): r is string => r !== null))].sort(),
    [tournaments],
  )
  const formats = useMemo(
    () => [...new Set(tournaments.map((t) => t.format))].sort(),
    [tournaments],
  )

  const filtered = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          (statusFilter === ALL || t.status === statusFilter) &&
          (regionFilter === ALL || t.region === regionFilter) &&
          (formatFilter === ALL || t.format === formatFilter),
      ),
    [tournaments, statusFilter, regionFilter, formatFilter],
  )

  const hasFilters =
    statusFilter !== ALL || regionFilter !== ALL || formatFilter !== ALL

  function clearFilters() {
    setStatusFilter(ALL)
    setRegionFilter(ALL)
    setFormatFilter(ALL)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-text-primary">Tournaments</h1>
        {isLoading ? (
          <div className="h-9 w-40 animate-pulse rounded-md bg-surface-2" />
        ) : canCreate ? (
          <Button
            asChild
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
          >
            <Link href="/dashboard/tournaments/create">
              <Plus size={15} />
              Create Tournament
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {['open', 'ongoing', 'completed', 'cancelled', 'draft'].map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Regions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Formats</SelectItem>
            {formats.map((f) => (
              <SelectItem key={f} value={f}>
                {formatLabel(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        {!loading && (
          <span className="ml-auto text-sm text-text-secondary">
            {filtered.length} tournament{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <TournamentSkeleton key={i} />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          filtered.map((t) => <TournamentCard key={t.id} tournament={t} />)
        )}
      </div>
    </div>
  )
}
