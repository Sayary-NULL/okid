import { cn } from '@/lib/utils'
import kpIcon from '@/assets/kinopoisk.ico'
import imdbIcon from '@/assets/imdb.png'
import tmdbIcon from '@/assets/tmdb.ico'
import shikimoriIcon from '@/assets/shikimori.ico'

const sites = {
  kp: { label: 'Кинопоиск', src: kpIcon },
  imdb: { label: 'IMDb', src: imdbIcon },
  tmdb: { label: 'TMDB', src: tmdbIcon },
  shikimori: { label: 'Shikimori', src: shikimoriIcon },
} as const

export type SiteKey = keyof typeof sites

export function ratingColor(value: number): string {
  if (value >= 10) return 'text-amber-400'
  if (value > 7) return 'text-green-500'
  if (value > 5) return 'text-yellow-500'
  return 'text-red-500'
}

export function SiteRating({ site, value }: { site: SiteKey; value: number }) {
  const s = sites[site]
  return (
    <span className="inline-flex items-center gap-1" title={`${s.label}: ${value}`}>
      <img src={s.src} alt={s.label} className="h-4 w-4 rounded object-contain" />
      <span className={cn('text-sm font-semibold tabular-nums', ratingColor(value))}>{value}</span>
    </span>
  )
}
