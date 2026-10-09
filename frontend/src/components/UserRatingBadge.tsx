import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UserRatingBadge({
  value,
  className,
}: {
  value: number | null
  className?: string
}) {
  if (value == null) return null
  const isGold = value === 10
  return (
    <span
      title={`Моя оценка: ${value}/10`}
      aria-label={`Моя оценка: ${value} из 10`}
      className={cn('inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums', className)}
    >
      <Star
        className={cn('h-4 w-4', isGold ? 'text-[#FFD700]' : 'text-yellow-400')}
        fill="currentColor"
        strokeWidth={0}
      />
      {value}/10
    </span>
  )
}
