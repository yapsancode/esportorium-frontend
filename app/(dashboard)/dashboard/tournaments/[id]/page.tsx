'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Trophy,
  CalendarDays,
  Users,
  MapPin,
  DollarSign,
  User,
  Swords,
  RefreshCw,
  Pencil,
  Loader2,
} from 'lucide-react'
import {
  getTournament,
  getTournamentBracket,
  getTournamentRegistrations,
  registerForTournament,
  generateBracket,
  type Tournament,
  type BracketMatch,
  type BracketRound,
  type Registration,
} from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

// ─── Role helper ──────────────────────────────────────────────────────────────

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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-terra-subtle text-terra border-terra-border',
  ongoing: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-secondary text-text-secondary border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  draft: 'bg-surface text-text-secondary border-border',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  ongoing: 'In Progress',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Registration status badge ────────────────────────────────────────────────

const REG_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-terra-subtle text-terra border-terra-border',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  checked_in: 'bg-blue-100 text-blue-700 border-blue-200',
}

function RegStatusBadge({ status }: { status: string }) {
  const label = status.replace('_', ' ')
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${REG_STATUS_STYLES[status] ?? 'bg-surface text-text-secondary border-border'}`}
    >
      {label}
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REGISTRATION_MESSAGES: Record<string, { text: string; style: string }> = {
  draft: {
    text: 'This tournament is not yet open for registration',
    style: 'bg-surface text-text-secondary border-border',
  },
  open: {
    text: 'Registration is open — join now!',
    style: 'bg-terra-subtle text-terra border-terra-border',
  },
  ongoing: {
    text: 'Tournament is in progress',
    style: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  completed: {
    text: 'Tournament has ended',
    style: 'bg-secondary text-text-secondary border-border',
  },
  cancelled: {
    text: 'This tournament has been cancelled',
    style: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

function formatLabel(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-text-tertiary">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-sm font-medium text-text-primary">{value}</span>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-2/3 rounded bg-surface-2" />
      <div className="h-4 w-1/3 rounded bg-surface-2" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-full bg-surface-2" />
        <div className="h-6 w-20 rounded-full bg-surface-2" />
      </div>
      <div className="h-48 rounded-xl bg-surface-2" />
    </div>
  )
}

// ─── Bracket round section ────────────────────────────────────────────────────

function participantName(
  user: { username: string; display_name: string | null } | null,
) {
  if (!user) return 'TBD'
  return user.display_name ?? user.username
}

function MatchCard({ match }: { match: BracketMatch }) {
  function participantClass(id: string | null) {
    if (!id) return 'text-text-tertiary italic'
    if (match.winner_id && id === match.winner_id) return 'font-semibold text-terra'
    if (match.winner_id) return 'text-text-tertiary line-through'
    return 'text-text-primary'
  }

  return (
    <Card className="w-full">
      <CardContent className="py-3 px-4 flex flex-col gap-1">
        <span className={`text-sm truncate ${participantClass(match.participant_1)}`}>
          {participantName(match.participant_1_user)}
        </span>

        <div className="flex items-center gap-2 py-0.5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold tracking-widest text-terra uppercase">VS</span>
          <span className="text-xs font-mono font-semibold text-text-secondary tabular-nums">
            {match.team_1_wins} – {match.team_2_wins}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <span className={`text-sm truncate ${participantClass(match.participant_2)}`}>
          {participantName(match.participant_2_user)}
        </span>

        <div className="flex justify-end pt-1">
          <StatusBadge status={match.status} />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.isLoading)

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [bracket, setBracket] = useState<BracketRound[] | null>(null)
  const [bracketLoading, setBracketLoading] = useState(false)
  const [bracketFetched, setBracketFetched] = useState(false)

  const [registrations, setRegistrations] = useState<Registration[] | null>(null)
  const [registrationsLoading, setRegistrationsLoading] = useState(false)
  const [registrationsFetched, setRegistrationsFetched] = useState(false)

  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState('overview')

  // Derived role flags
  const userRole = user?.role ?? ''
  const isOrganizer = hasMinRole(userRole, 'organizer')
  const ownsThisTournament =
    isOrganizer && user?.id === tournament?.organizer_id

  // Fetch bracket (used lazily and after generation)
  const fetchBracket = useCallback(() => {
    setBracketLoading(true)
    getTournamentBracket(id)
      .then((matches) => setBracket(matches))
      .catch(() => setBracket([]))
      .finally(() => setBracketLoading(false))
  }, [id])

  // Fetch tournament on mount
  useEffect(() => {
    getTournament(id)
      .then((t) => setTournament(t))
      .catch(() => setPageError('Tournament not found or failed to load.'))
      .finally(() => setPageLoading(false))
  }, [id])

  // Fetch bracket once tournament has loaded and tab is active
  useEffect(() => {
    if (activeTab !== 'bracket') return
    if (!tournament) return // wait for tournament to load first
    if (bracketFetched) return
    setBracketFetched(true)
    fetchBracket()
  }, [activeTab, tournament, bracketFetched, fetchBracket])

  // Fetch registrations lazily (organizer + owner only)
  function handleParticipantsTabSelect() {
    if (registrationsFetched || !ownsThisTournament) return
    setRegistrationsFetched(true)
    setRegistrationsLoading(true)
    getTournamentRegistrations(id)
      .then((regs) => setRegistrations(regs))
      .catch(() => setRegistrations([]))
      .finally(() => setRegistrationsLoading(false))
  }

  function handleTabChange(value: string) {
    setActiveTab(value)
    if (value === 'participants') handleParticipantsTabSelect()
  }

  async function handleRegister() {
    setRegisterLoading(true)
    setRegisterError(null)
    try {
      await registerForTournament(id)
      setIsRegistered(true)
    } catch {
      setRegisterError('Registration failed. You may already be registered.')
    } finally {
      setRegisterLoading(false)
    }
  }

  async function handleGenerateBracket() {
    setGenerateLoading(true)
    setGenerateError(null)
    try {
      await generateBracket(id)
      // Refresh tournament status badge
      getTournament(id).then((t) => setTournament(t)).catch(() => {})
      // Reset bracket cache and refetch
      setBracketFetched(true)
      setBracket(null)
      fetchBracket()
      // Switch to bracket tab
      setActiveTab('bracket')
      toast.success('Bracket generated successfully!')
    } catch {
      setGenerateError('Failed to generate bracket.')
    } finally {
      setGenerateLoading(false)
    }
  }

  if (pageLoading || authLoading) return <PageSkeleton />

  if (pageError || !tournament) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Trophy size={36} className="text-text-tertiary" />
        <p className="font-medium text-text-primary">
          {pageError ?? 'Tournament not found.'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  const showVenue =
    (tournament.tournament_type === 'physical' ||
      tournament.tournament_type === 'hybrid') &&
    (tournament.venue_name || tournament.venue_address)

  const rounds = bracket ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl text-text-primary">
              {tournament.name}
            </h1>
            <p className="text-sm text-text-secondary">{tournament.game}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Non-owner users: register area */}
            {!ownsThisTournament && (
              isRegistered ? (
                <span className="rounded-full border border-terra-border bg-terra-subtle px-3 py-1.5 text-sm font-medium text-terra">
                  Registered
                </span>
              ) : tournament.status === 'open' ? (
                <Button
                  onClick={handleRegister}
                  disabled={registerLoading}
                  className="bg-terra text-primary-foreground hover:bg-terra-dark"
                >
                  {registerLoading ? 'Registering…' : 'Register'}
                </Button>
              ) : (
                <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-secondary">
                  Registration Closed
                </span>
              )
            )}

            {/* Organizer (owns): Generate Bracket + Edit */}
            {ownsThisTournament && (
              <>
                {!['in_progress', 'ongoing', 'completed'].includes(tournament.status) && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateBracket}
                    disabled={generateLoading}
                  >
                    {generateLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    {generateLoading ? 'Generating…' : 'Generate Bracket'}
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/tournaments/${id}/edit`}>
                    <Pencil size={15} />
                    Edit Tournament
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status + format + type badges */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={tournament.status} />
          <Badge variant="outline">{formatLabel(tournament.match_format)}</Badge>
          <Badge variant="outline">{formatLabel(tournament.tournament_type)}</Badge>
          {tournament.region && (
            <Badge variant="outline">{tournament.region}</Badge>
          )}
        </div>

        {/* Registration status banner — shown to non-owners, not already registered */}
        {!ownsThisTournament && !isRegistered && (() => {
          const msg = REGISTRATION_MESSAGES[tournament.status]
          if (!msg) return null
          return (
            <p className={`rounded-md border px-4 py-2 text-sm ${msg.style}`}>
              {msg.text}
            </p>
          )
        })()}

        {/* Inline errors */}
        {registerError && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {registerError}
          </p>
        )}
        {generateError && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {generateError}
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        {/* ── Tab: Overview ── */}
        <TabsContent value="overview" className="mt-4 flex flex-col gap-4">
          {tournament.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary whitespace-pre-line">
                  {tournament.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                icon={<User size={15} />}
                label="Organizer"
                value={
                  tournament.organizer.display_name ??
                  tournament.organizer.username
                }
              />
              <DetailRow
                icon={<CalendarDays size={15} />}
                label="Start Date"
                value={formatDate(tournament.start_date)}
              />
              <DetailRow
                icon={<CalendarDays size={15} />}
                label="End Date"
                value={formatDate(tournament.end_date)}
              />
              <DetailRow
                icon={<Users size={15} />}
                label="Max Teams"
                value={tournament.max_teams}
              />
              <DetailRow
                icon={<Swords size={15} />}
                label="Format"
                value={formatLabel(tournament.match_format)}
              />
              <DetailRow
                icon={<MapPin size={15} />}
                label="Region"
                value={tournament.region ?? '—'}
              />
              {tournament.prize_pool !== null &&
                tournament.prize_pool !== undefined && (
                  <DetailRow
                    icon={<DollarSign size={15} />}
                    label="Prize Pool"
                    value={`$${tournament.prize_pool.toLocaleString()}`}
                  />
                )}
              {showVenue && (
                <DetailRow
                  icon={<MapPin size={15} />}
                  label="Venue"
                  value={
                    [tournament.venue_name, tournament.venue_address]
                      .filter(Boolean)
                      .join(', ') || '—'
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Bracket ── */}
        <TabsContent value="bracket" className="mt-4">
          {bracketLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-surface-2" />
              ))}
            </div>
          ) : bracket === null ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Swords size={32} className="text-text-tertiary" />
              <p className="font-medium text-text-primary">
                Bracket not generated yet
              </p>
              {ownsThisTournament && (
                <p className="text-sm text-text-secondary">
                  Use the &ldquo;Generate Bracket&rdquo; button above when
                  you&apos;re ready.
                </p>
              )}
            </div>
          ) : rounds.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Swords size={32} className="text-text-tertiary" />
              <p className="font-medium text-text-primary">No matches yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {rounds.map(({ round, matches }) => (
                <div key={round} className="flex flex-col gap-3">
                  <h3 className="font-display text-lg text-text-primary">
                    Round {round}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {matches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Participants ── */}
        <TabsContent value="participants" className="mt-4">
          {!ownsThisTournament ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Users size={32} className="text-text-tertiary" />
              <p className="font-medium text-text-primary">
                Participant list is only visible to the tournament organizer.
              </p>
            </div>
          ) : registrationsLoading ? (
            <div className="flex flex-col gap-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-surface-2" />
              ))}
            </div>
          ) : !registrations || registrations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
              <Users size={32} className="text-text-tertiary" />
              <p className="font-medium text-text-primary">No registrations yet</p>
              <p className="text-sm text-text-secondary">
                Participants will appear here once they register.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {registrations.map((reg) => (
                <Card key={reg.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-text-secondary">
                        {(
                          reg.user.display_name ?? reg.user.username
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-text-primary">
                          {reg.user.display_name ?? reg.user.username}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          @{reg.user.username}
                        </span>
                      </div>
                    </div>
                    <RegStatusBadge status={reg.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
