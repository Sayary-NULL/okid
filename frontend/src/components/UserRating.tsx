import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UserRating({
  value,
  onRate,
  disabled,
}: {
  value: number | null
  onRate: (rating: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? value ?? 0
  const isGold = active === 10

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Оценка пользователя"
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => {
        const filled = star <= active
        return (
          <button
            key={star}
            type="button"
            role="radio"
            disabled={disabled}
            title={`Оценка ${star}`}
            aria-label={`Оценка ${star}`}
            aria-checked={value === star}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(null)}
            onClick={() => onRate(star)}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Star
              className={cn(
                'h-5 w-5',
                filled
                  ? isGold
                    ? 'text-[#FFD700]'
                    : 'text-yellow-400'
                  : 'text-muted-foreground/40',
              )}
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={filled ? 0 : 2}
            />
          </button>
        )
      })}
      {value != null && (
        <span className="ml-1 text-sm font-semibold tabular-nums text-muted-foreground">
          {value}/10
        </span>
      )}
    </div>
  )
}
