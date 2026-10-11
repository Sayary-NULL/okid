import type { StatBucket, StatSlice } from '@/types'

const SLICES: { key: StatSlice; label: string; color: string }[] = [
  { key: 'movie_anime', label: 'Фильмы · аниме', color: '#2563eb' },
  { key: 'movie_not_anime', label: 'Фильмы', color: '#93c5fd' },
  { key: 'series_anime', label: 'Сериалы · аниме', color: '#dc2626' },
  { key: 'series_not_anime', label: 'Сериалы', color: '#fca5a5' },
]

function SliceLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {SLICES.map((slice) => (
        <span key={slice.key} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: slice.color }}
          />
          {slice.label}
        </span>
      ))}
    </div>
  )
}

export function HistogramChart({ buckets }: { buckets: StatBucket[] }) {
  if (!buckets.length) {
    return <p className="text-sm text-muted-foreground">Нет данных</p>
  }

  const max = Math.max(
    1,
    ...buckets.flatMap((bucket) => SLICES.map((slice) => bucket.counts[slice.key])),
  )

  return (
    <div className="space-y-4">
      <SliceLegend />
      <div className="space-y-4">
        {buckets.map((bucket) => (
          <div key={bucket.bucket} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium" title={bucket.label}>
                {bucket.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                всего: {bucket.total}
              </span>
            </div>
            <div className="space-y-0.5">
              {SLICES.map((slice) => {
                const value = bucket.counts[slice.key]
                return (
                  <div key={slice.key} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-[11px] text-muted-foreground">
                      {slice.label}
                    </span>
                    <div className="h-3.5 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${(value / max) * 100}%`,
                          backgroundColor: slice.color,
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums">
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
