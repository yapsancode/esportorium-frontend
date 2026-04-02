'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { getTournament, updateTournament, type Tournament } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Role helpers ─────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const REGIONS = ['MY', 'ID', 'PH', 'TH', 'SG'] as const

const REGION_LABELS: Record<string, string> = {
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  TH: 'Thailand',
  SG: 'Singapore',
}

const TOURNAMENT_TYPES = [
  { value: 'online', label: 'Online' },
  { value: 'physical', label: 'Physical' },
  { value: 'hybrid', label: 'Hybrid' },
]

const MATCH_FORMATS = [
  { value: 'bo1', label: 'Best of 1' },
  { value: 'bo3', label: 'Best of 3' },
  { value: 'bo5', label: 'Best of 5' },
]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  open: 'Open',
  in_progress: 'In Progress',
  ongoing: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Returns the statuses an organizer may transition to from the current status.
function allowedNextStatuses(current: string): string[] {
  if (current === 'draft') return ['open']
  if (current === 'open') return ['cancelled']
  return []
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ISO datetime → "YYYY-MM-DD" for <input type="date">
function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function formatLabel(v: string) {
  return v.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const dateInputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-destructive">{msg}</p>
}

function LockedNote() {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
      <Lock size={11} />
      Cannot change after bracket is generated
    </p>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  region: string
  tournament_type: string
  venue_name: string
  venue_address: string
  match_format: string
  max_teams: string
  start_date: string
  end_date: string
  prize_pool: string
  status: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

function tournamentToForm(t: Tournament): FormState {
  return {
    name: t.name,
    description: t.description ?? '',
    region: t.region ?? '',
    tournament_type: t.tournament_type,
    venue_name: t.venue_name ?? '',
    venue_address: t.venue_address ?? '',
    match_format: t.match_format,
    max_teams: String(t.max_teams),
    start_date: toDateInput(t.start_date),
    end_date: toDateInput(t.end_date),
    prize_pool: t.prize_pool != null ? String(t.prize_pool) : '',
    status: t.status,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditTournamentPage({
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

  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch tournament and pre-fill form
  useEffect(() => {
    getTournament(id)
      .then((t) => {
        setTournament(t)
        setForm(tournamentToForm(t))
      })
      .catch(() => setPageError('Tournament not found or failed to load.'))
      .finally(() => setPageLoading(false))
  }, [id])

  // Redirect once auth + tournament are both ready, if user doesn't own it
  useEffect(() => {
    if (authLoading || !tournament) return
    const isOrganizer = hasMinRole(user?.role ?? '', 'organizer')
    const ownsIt = isOrganizer && user?.id === tournament.organizer_id
    if (!ownsIt) {
      router.replace(`/dashboard/tournaments/${id}`)
    }
  }, [authLoading, user, tournament, id, router])

  function update(key: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(f: FormState): FormErrors {
    const e: FormErrors = {}
    if (!f.name.trim()) e.name = 'Tournament name is required.'
    const needsVenue =
      f.tournament_type === 'physical' || f.tournament_type === 'hybrid'
    if (needsVenue && !f.venue_name.trim()) e.venue_name = 'Venue name is required.'
    if (needsVenue && !f.venue_address.trim()) e.venue_address = 'Venue address is required.'
    if (f.start_date && f.end_date && f.end_date < f.start_date)
      e.end_date = 'End date must be after start date.'
    if (f.prize_pool && isNaN(Number(f.prize_pool)))
      e.prize_pool = 'Prize pool must be a number.'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !tournament) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    const isFrozen =
      tournament.status === 'in_progress' ||
      tournament.status === 'ongoing' ||
      tournament.status === 'completed'

    const needsVenue =
      form.tournament_type === 'physical' || form.tournament_type === 'hybrid'

    try {
      await updateTournament(id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        region: form.region || null,
        tournament_type: form.tournament_type,
        venue_name: needsVenue ? form.venue_name.trim() : null,
        venue_address: needsVenue ? form.venue_address.trim() : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        prize_pool: form.prize_pool ? Number(form.prize_pool) : null,
        ...(!isFrozen && { match_format: form.match_format }),
        ...(!isFrozen && { max_teams: Number(form.max_teams) }),
        ...(form.status !== tournament.status && { status: form.status }),
      })
      toast.success('Tournament saved.')
      router.push(`/dashboard/tournaments/${id}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
      setSubmitError(detail ?? 'Failed to save changes. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (pageLoading || authLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 rounded bg-surface-2" />
        <div className="h-96 rounded-xl bg-surface-2" />
      </div>
    )
  }

  if (pageError || !form || !tournament) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium text-text-primary">
          {pageError ?? 'Tournament not found.'}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const isFrozen =
    tournament.status === 'in_progress' ||
    tournament.status === 'ongoing' ||
    tournament.status === 'completed'

  const nextStatuses = allowedNextStatuses(tournament.status)
  const canChangeStatus = nextStatuses.length > 0
  const needsVenue =
    form.tournament_type === 'physical' || form.tournament_type === 'hybrid'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/tournaments/${id}`}>
            <ArrowLeft size={18} />
          </Link>
        </Button>
        <h1 className="font-display text-3xl text-text-primary">
          Edit Tournament
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Basic Info ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Tournament Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. SEA Invitational Cup"
              />
              <FieldError msg={errors.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe your tournament (optional)"
                className="flex min-h-[96px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Region</Label>
              <Select
                value={form.region}
                onValueChange={(v) => update('region', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REGION_LABELS[r]} ({r})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Venue ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Venue</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label>Tournament Type</Label>
              <Select
                value={form.tournament_type}
                onValueChange={(v) => update('tournament_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsVenue && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="venue_name">
                    Venue Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venue_name"
                    value={form.venue_name}
                    onChange={(e) => update('venue_name', e.target.value)}
                    placeholder="e.g. Axiata Arena"
                  />
                  <FieldError msg={errors.venue_name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="venue_address">
                    Venue Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="venue_address"
                    value={form.venue_address}
                    onChange={(e) => update('venue_address', e.target.value)}
                    placeholder="e.g. Bukit Jalil, Kuala Lumpur"
                  />
                  <FieldError msg={errors.venue_address} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Schedule & Prize ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Schedule & Prize</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start_date">Start Date</Label>
                <input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => update('start_date', e.target.value)}
                  className={dateInputClass}
                />
                <FieldError msg={errors.start_date} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end_date">End Date</Label>
                <input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => update('end_date', e.target.value)}
                  className={dateInputClass}
                />
                <FieldError msg={errors.end_date} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prize_pool">Prize Pool (USD)</Label>
              <Input
                id="prize_pool"
                type="number"
                min={0}
                value={form.prize_pool}
                onChange={(e) => update('prize_pool', e.target.value)}
                placeholder="Optional"
              />
              <FieldError msg={errors.prize_pool} />
            </div>
          </CardContent>
        </Card>

        {/* ── Format (locked once bracket is generated) ────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Format</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label>Match Format</Label>
              {isFrozen ? (
                <>
                  <Input
                    value={
                      MATCH_FORMATS.find((f) => f.value === tournament.match_format)
                        ?.label ?? formatLabel(tournament.match_format)
                    }
                    readOnly
                    className="cursor-not-allowed opacity-60"
                  />
                  <LockedNote />
                </>
              ) : (
                <Select
                  value={form.match_format}
                  onValueChange={(v) => update('match_format', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_FORMATS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max_teams">Max Teams</Label>
              <Input
                id="max_teams"
                type="number"
                min={4}
                max={128}
                value={form.max_teams}
                readOnly={isFrozen}
                disabled={isFrozen}
                onChange={(e) => update('max_teams', e.target.value)}
                className={isFrozen ? 'cursor-not-allowed opacity-60' : ''}
              />
              {isFrozen ? (
                <LockedNote />
              ) : (
                <p className="text-xs text-text-secondary">Between 4 and 128 teams.</p>
              )}
            </div>

            {tournament.format && (
              <div className="flex flex-col gap-1.5">
                <Label>Bracket Format</Label>
                <Input
                  value={formatLabel(tournament.format)}
                  readOnly
                  className="cursor-not-allowed opacity-60"
                />
                <LockedNote />
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Status ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent>
            {canChangeStatus ? (
              <div className="flex flex-col gap-1.5">
                <Label>Tournament Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => update('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={tournament.status}>
                      {STATUS_LABELS[tournament.status] ?? tournament.status} (current)
                    </SelectItem>
                    {nextStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s] ?? s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-text-secondary">
                  {tournament.status === 'draft' &&
                    'Opening registration will allow players to sign up.'}
                  {tournament.status === 'open' &&
                    'Cancelling cannot be undone.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label>Tournament Status</Label>
                <Input
                  value={STATUS_LABELS[tournament.status] ?? tournament.status}
                  readOnly
                  className="cursor-not-allowed opacity-60"
                />
                <p className="mt-1 text-xs text-text-secondary">
                  Status cannot be changed once a tournament is{' '}
                  {tournament.status === 'completed' ? 'completed' : 'in progress'}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        {submitError && (
          <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/tournaments/${id}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
