'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createTournament } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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

const STEP_TITLES = ['Basic Info', 'Format & Rules', 'Review & Create']

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  game: string
  region: string
  description: string
  tournament_type: string
  venue_name: string
  venue_address: string
  match_format: string
  max_teams: string
  start_date: string
  end_date: string
  prize_pool: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const INITIAL: FormData = {
  name: '',
  game: 'mobile_legends',
  region: '',
  description: '',
  tournament_type: '',
  venue_name: '',
  venue_address: '',
  match_format: '',
  max_teams: '8',
  start_date: '',
  end_date: '',
  prize_pool: '',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              n === step
                ? 'bg-terra text-white'
                : n < step
                  ? 'bg-terra/25 text-terra'
                  : 'bg-surface-2 text-text-secondary'
            }`}
          >
            {n}
          </div>
          {n < 3 && (
            <div
              className={`h-px w-10 ${n < step ? 'bg-terra' : 'bg-border'}`}
            />
          )}
        </div>
      ))}
      <span className="ml-4 text-sm text-text-secondary">
        Step {step} of 3 — {STEP_TITLES[step - 1]}
      </span>
    </div>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-destructive">{msg}</p>
}

function ReviewRow({
  label,
  value,
}: {
  label: string
  value?: string | number
}) {
  if (value === undefined || value === '') return null
  return (
    <div className="flex gap-3 border-b border-border py-2.5 last:border-0">
      <span className="w-36 shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}

// Matches the styling of the Shadcn Input component for plain <input type="date">
const dateInputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateTournamentPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Redirect non-organizers once auth has resolved
  useEffect(() => {
    if (!isLoading && !hasMinRole(user?.role ?? '', 'organizer')) {
      router.replace('/dashboard')
    }
  }, [isLoading, user, router])

  function update(key: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validateStep1(): boolean {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Tournament name is required.'
    if (!form.region) e.region = 'Region is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    const e: FormErrors = {}
    if (!form.tournament_type) e.tournament_type = 'Tournament type is required.'
    const needsVenue =
      form.tournament_type === 'physical' || form.tournament_type === 'hybrid'
    if (needsVenue && !form.venue_name.trim())
      e.venue_name = 'Venue name is required.'
    if (needsVenue && !form.venue_address.trim())
      e.venue_address = 'Venue address is required.'
    if (!form.match_format) e.match_format = 'Match format is required.'
    const teams = Number(form.max_teams)
    if (!form.max_teams || isNaN(teams) || teams < 4 || teams > 128)
      e.max_teams = 'Max teams must be between 4 and 128.'
    if (!form.start_date) e.start_date = 'Start date is required.'
    if (!form.end_date) e.end_date = 'End date is required.'
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      e.end_date = 'End date must be after start date.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const needsVenue =
        form.tournament_type === 'physical' || form.tournament_type === 'hybrid'
      const tournament = await createTournament({
        name: form.name.trim(),
        game: form.game,
        region: form.region,
        ...(form.description.trim() && { description: form.description.trim() }),
        tournament_type: form.tournament_type,
        ...(needsVenue && { venue_name: form.venue_name.trim() }),
        ...(needsVenue && { venue_address: form.venue_address.trim() }),
        match_format: form.match_format,
        max_teams: Number(form.max_teams),
        start_date: form.start_date,
        end_date: form.end_date,
        ...(form.prize_pool && { prize_pool: Number(form.prize_pool) }),
      })
      router.push(`/dashboard/tournaments/${tournament.id}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
      setSubmitError(
        detail ?? 'Failed to create tournament. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Hold rendering until auth resolves (avoids flash of form for non-organizers)
  if (isLoading) return null

  const needsVenue =
    form.tournament_type === 'physical' || form.tournament_type === 'hybrid'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Header */}
      <h1 className="font-display text-3xl text-text-primary">
        Create Tournament
      </h1>

      {/* Step indicator */}
      <StepIndicator step={step} />

      {/* Form card */}
      <Card>
        <CardContent className="pt-6">
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">
                  Tournament Name{' '}
                  <span className="text-destructive">*</span>
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
                <Label htmlFor="game">Game</Label>
                <Input
                  id="game"
                  value="Mobile Legends: Bang Bang"
                  readOnly
                  className="cursor-not-allowed opacity-60"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Region <span className="text-destructive">*</span>
                </Label>
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
                <FieldError msg={errors.region} />
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
            </div>
          )}

          {/* ── Step 2: Format & Rules ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label>
                  Tournament Type <span className="text-destructive">*</span>
                </Label>
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
                <FieldError msg={errors.tournament_type} />
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

              <div className="flex flex-col gap-1.5">
                <Label>
                  Match Format <span className="text-destructive">*</span>
                </Label>
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
                <FieldError msg={errors.match_format} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="max_teams">
                  Max Teams <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max_teams"
                  type="number"
                  min={4}
                  max={128}
                  value={form.max_teams}
                  onChange={(e) => update('max_teams', e.target.value)}
                />
                <p className="text-xs text-text-secondary">
                  Between 4 and 128 teams.
                </p>
                <FieldError msg={errors.max_teams} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start_date">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
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
                  <Label htmlFor="end_date">
                    End Date <span className="text-destructive">*</span>
                  </Label>
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
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Create ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Basic Info
                </p>
                <div className="rounded-lg border border-border px-4">
                  <ReviewRow label="Tournament Name" value={form.name} />
                  <ReviewRow
                    label="Game"
                    value="Mobile Legends: Bang Bang"
                  />
                  <ReviewRow
                    label="Region"
                    value={`${REGION_LABELS[form.region]} (${form.region})`}
                  />
                  {form.description.trim() && (
                    <ReviewRow
                      label="Description"
                      value={form.description.trim()}
                    />
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Format & Rules
                </p>
                <div className="rounded-lg border border-border px-4">
                  <ReviewRow
                    label="Tournament Type"
                    value={
                      TOURNAMENT_TYPES.find(
                        (t) => t.value === form.tournament_type,
                      )?.label
                    }
                  />
                  {needsVenue && (
                    <ReviewRow label="Venue Name" value={form.venue_name} />
                  )}
                  {needsVenue && (
                    <ReviewRow
                      label="Venue Address"
                      value={form.venue_address}
                    />
                  )}
                  <ReviewRow
                    label="Match Format"
                    value={
                      MATCH_FORMATS.find((f) => f.value === form.match_format)
                        ?.label
                    }
                  />
                  <ReviewRow label="Max Teams" value={form.max_teams} />
                  <ReviewRow
                    label="Start Date"
                    value={new Date(form.start_date).toLocaleDateString(
                      undefined,
                      { year: 'numeric', month: 'long', day: 'numeric' },
                    )}
                  />
                  <ReviewRow
                    label="End Date"
                    value={new Date(form.end_date).toLocaleDateString(
                      undefined,
                      { year: 'numeric', month: 'long', day: 'numeric' },
                    )}
                  />
                  {form.prize_pool && (
                    <ReviewRow
                      label="Prize Pool"
                      value={`$${Number(form.prize_pool).toLocaleString()}`}
                    />
                  )}
                </div>
              </div>

              {submitError && (
                <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {submitError}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step navigation */}
      <div className="flex justify-between">
        {step > 1 ? (
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={submitting}
          >
            <ChevronLeft size={15} />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <Button
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
            onClick={handleNext}
          >
            Next
            <ChevronRight size={15} />
          </Button>
        ) : (
          <Button
            className="bg-terra text-primary-foreground hover:bg-terra-dark"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Tournament'}
          </Button>
        )}
      </div>
    </div>
  )
}
