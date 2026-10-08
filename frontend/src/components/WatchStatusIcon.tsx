import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MyStatus } from '@/types'

export const watchStatusLabels: Record<MyStatus, string> = {
  plan_to_watch: 'Планирую',
  watching: 'Смотрю',
  dropped: 'Бросил',
  completed: 'Просмотрено',
}

const watchStatusClasses: Record<MyStatus, string> = {
  plan_to_watch: 'bg-yellow-400 text-white',
  watching: 'bg-blue-500 text-white',
  dropped: 'bg-red-500 text-white',
  completed: 'bg-green-500 text-white',
}

export function WatchStatusIcon({
  status,
  className,
  iconClassName,
}: {
  status: MyStatus
  className?: string
  iconClassName?: string
}) {
  const label = watchStatusLabels[status] ?? status
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full shadow',
        watchStatusClasses[status],
        className,
      )}
    >
      <Eye className={cn('h-3.5 w-3.5', iconClassName)} />
    </span>
  )
}
