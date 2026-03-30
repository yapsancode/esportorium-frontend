import { cn } from '@/lib/utils'

type Plan = 'free' | 'pro' | 'business' | 'enterprise'

const styles: Record<Plan, string> = {
  free: 'bg-surface text-text-secondary border border-border',
  pro: 'bg-terra-subtle text-terra border border-terra-border',
  business: 'bg-amber-100 text-amber-700 border border-amber-200',
  enterprise: 'bg-purple-100 text-purple-700 border border-purple-200',
}

const labels: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
}

interface PlanBadgeProps {
  plan: string
  className?: string
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const key = (plan as Plan) in styles ? (plan as Plan) : 'free'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles[key],
        className,
      )}
    >
      {labels[key]}
    </span>
  )
}
