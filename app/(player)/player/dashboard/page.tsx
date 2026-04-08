'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps'
import { getTournaments, type Tournament } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const GEO_URL = '/malaysia-states.json'

const MALAYSIA_STATES = [
  'Selangor',
  'Pahang',
  'Pulau Pinang',
  'Sarawak',
  'Kedah',
  'Perak',
  'Sabah',
  'Kelantan',
  'Negeri Sembilan',
  'W.P. Kuala Lumpur',
  'W.P. Labuan',
  'Perlis',
  'Johor',
  'Melaka',
  'Terengganu',
  'W.P. Putrajaya',
]

function getFillColor(count: number) {
  if (count === 0) return '#E3DDD6'
  if (count <= 2) return '#EDD5CB'
  if (count <= 5) return '#C97050'
  return '#B5502A'
}

function darken(hex: string) {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - 20)
  const g = Math.max(0, ((num >> 8) & 0xff) - 20)
  const b = Math.max(0, (num & 0xff) - 20)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export default function PlayerDashboardPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedState, setSelectedState] = useState<string>('all')
  const [filterFormat, setFilterFormat] = useState<string>('all')
  const [filterPrize, setFilterPrize] = useState<string>('all')
  const [tooltip, setTooltip] = useState<{
    name: string
    count: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    getTournaments().then(setTournaments).catch(() => {})
  }, [])

  // Count tournaments per state (based on region field)
  const countByState = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of MALAYSIA_STATES) map[s] = 0
    for (const t of tournaments) {
      if (t.status !== 'open') continue
      const region = t.region ?? ''
      if (map[region] !== undefined) map[region]++
    }
    return map
  }, [tournaments])

  const openTournaments = useMemo(
    () => tournaments.filter((t) => t.status === 'open'),
    [tournaments],
  )

  const activeStatesCount = useMemo(
    () => Object.values(countByState).filter((c) => c > 0).length,
    [countByState],
  )

  // Filtered tournaments for right panel
  const filteredTournaments = useMemo(() => {
    let list = openTournaments
    if (selectedState !== 'all') {
      list = list.filter((t) => t.region === selectedState)
    }
    if (filterFormat !== 'all') {
      list = list.filter((t) => t.match_format === filterFormat)
    }
    if (filterPrize !== 'all') {
      if (filterPrize === 'free') {
        list = list.filter((t) => !t.prize_pool || t.prize_pool === 0)
      } else if (filterPrize === 'paid') {
        list = list.filter((t) => t.prize_pool && t.prize_pool > 0)
      }
    }
    return list
  }, [openTournaments, selectedState, filterFormat, filterPrize])

  const handleStateClick = useCallback((stateName: string) => {
    setSelectedState((prev) => (prev === stateName ? 'all' : stateName))
  }, [])

  const panelTitle =
    selectedState !== 'all' ? selectedState : 'Select a state'
  const panelDescription =
    selectedState !== 'all'
      ? `${filteredTournaments.length} tournament${filteredTournaments.length !== 1 ? 's' : ''}`
      : 'Click any highlighted state'

  return (
    <div className="relative h-full w-full bg-background">
      {/* Title overlay */}
      <div className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 text-center">
        <h1 className="font-display text-5xl tracking-widest text-text-primary">
          FIND YOUR TOURNAMENT
        </h1>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          {openTournaments.length} open &middot; {activeStatesCount} state{activeStatesCount !== 1 ? 's' : ''} active
        </p>
      </div>

      {/* Legend overlay */}
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded" style={{ background: '#E3DDD6' }} /> 0
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded" style={{ background: '#EDD5CB' }} /> 1-2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded" style={{ background: '#C97050' }} /> 3-5
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded" style={{ background: '#B5502A' }} /> 6+
        </span>
      </div>

      {/* Full-bleed map */}
      <div className="h-full w-full">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [109.5, 4],
            scale: 2800,
          }}
          width={800}
          height={500}
          className="h-full w-full"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.state as string
                const count = countByState[stateName] ?? 0
                const baseColor = getFillColor(count)
                const isSelected = selectedState === stateName

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isSelected ? darken(baseColor) : baseColor}
                    stroke="#fff"
                    strokeWidth={0.8}
                    style={{
                      hover: { fill: darken(baseColor) },
                      pressed: { fill: darken(baseColor) },
                    }}
                    onMouseEnter={(e) => {
                      setTooltip({
                        name: stateName,
                        count,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => handleStateClick(stateName)}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-text-primary">{tooltip.name}</p>
          <p className="text-text-secondary">
            {tooltip.count} tournament{tooltip.count !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Floating tournament panel */}
      <Card className="absolute bottom-6 right-6 top-6 z-10 flex w-80 flex-col overflow-hidden shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>{panelTitle}</CardTitle>
          <CardDescription>{panelDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {MALAYSIA_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex w-full gap-2">
              <Select value={filterFormat} onValueChange={setFilterFormat}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="BO1">BO1</SelectItem>
                  <SelectItem value="BO3">BO3</SelectItem>
                  <SelectItem value="BO5">BO5</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPrize} onValueChange={setFilterPrize}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Prize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Prize</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Has Prize</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tournament list */}
          <div className="p-3">
            {filteredTournaments.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-text-secondary">
                No tournaments found
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredTournaments.map((t) => (
                  <TournamentCard
                    key={t.id}
                    tournament={t}
                    onView={() => router.push(`/player/tournaments/${t.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TournamentCard({
  tournament,
  onView,
}: {
  tournament: Tournament
  onView: () => void
}) {
  const prize = tournament.prize_pool
    ? `RM ${tournament.prize_pool.toLocaleString()}`
    : 'Free'

  const date = tournament.start_date
    ? new Date(tournament.start_date).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'TBA'

  return (
    <div className="rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {tournament.name}
          </h3>
          <p className="mt-1 text-xs text-text-secondary">{tournament.region ?? 'Online'}</p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-terra/30 text-terra"
        >
          {tournament.match_format}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
        <span>{prize}</span>
        <span>{date}</span>
        <span>{tournament.max_teams} slots</span>
      </div>

      <button
        onClick={onView}
        className="mt-3 w-full rounded-lg bg-terra px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-terra/90"
      >
        View &amp; Join
      </button>
    </div>
  )
}
