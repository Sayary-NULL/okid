import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMediaList, useGenres, useInformersList, useToggleFavorite } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Star, Download, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import type { MediaEntry } from '@/types'

const statusLabels: Record<string, string> = {
  plan_to_watch: 'Планирую',
  watching: 'Смотрю',
  dropped: 'Бросил',
  completed: 'Просмотрено',
}

const downloadLabels: Record<string, string> = {
  none: 'Нет',
  need_download: 'Скачать',
  downloaded: 'Скачано',
}

const downloadIconClasses: Record<string, string> = {
  need_download: 'bg-yellow-400 text-white',
  downloaded: 'bg-green-500 text-black',
}

function MediaCard({ entry }: { entry: MediaEntry }) {
  const posterSrc = entry.poster_local || entry.poster_url
  const toggleFavorite = useToggleFavorite()

  const handleToggleFavorite = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite.mutate({ id: entry.id, isFavorite: !entry.is_favorite })
  }

  return (
    <Link to={`/media/${entry.id}`}>
      <Card className="hover:shadow-lg transition-shadow overflow-hidden">
        <div className="aspect-[2/3] bg-muted relative">
          {posterSrc ? (
            <img src={posterSrc} alt={entry.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Нет постера</div>
          )}
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-label={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={entry.is_favorite}
            className={cn(
              'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition-colors',
              entry.is_favorite
                ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                : 'bg-white text-black hover:bg-neutral-100',
            )}
          >
            <Star className="h-4 w-4" fill={entry.is_favorite ? 'currentColor' : 'none'} />
          </button>
          {entry.download_status !== 'none' && (
            <span
              title={downloadLabels[entry.download_status]}
              aria-label={downloadLabels[entry.download_status]}
              className={cn(
                'absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow',
                downloadIconClasses[entry.download_status],
              )}
            >
              <Download className="h-4 w-4" />
            </span>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="font-medium text-sm line-clamp-1">
            {entry.title}
            {entry.year_start && (
              <span className="ml-1 text-xs text-muted-foreground">{entry.year_start}</span>
            )}
          </p>
          <div className="flex items-center gap-1">
            <Badge>{statusLabels[entry.my_status] || entry.my_status}</Badge>
            {entry.my_rating != null && (
              <span
                className={cn(
                  'ml-auto inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums',
                  entry.my_rating === 10 ? 'text-[#FFD700]' : 'text-yellow-400',
                )}
                title={`Моя оценка: ${entry.my_rating}/10`}
              >
                <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                {entry.my_rating}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const wanted = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...wanted]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft /> Назад
      </Button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Вперёд <ChevronRight />
      </Button>
    </div>
  )
}

export default function RegistryPage() {
  const [q, setQ] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [type, setType] = useState('')
  const [myStatus, setMyStatus] = useState('')
  const [downloadStatus, setDownloadStatus] = useState('')
  const [genre, setGenre] = useState('')
  const [informer, setInformer] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAnime, setIsAnime] = useState(false)
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const params: Record<string, string> = {}
  if (searchQuery) params.q = searchQuery
  if (type) params.type = type
  if (myStatus) params.my_status = myStatus
  if (downloadStatus) params.download_status = downloadStatus
  if (genre) params.genre = genre
  if (informer) params.informer = informer
  if (isFavorite) params.is_favorite = 'true'
  if (isAnime) params.is_anime = 'true'
  if (page > 1) params.page = String(page)

  const { data, isLoading } = useMediaList(params)
  const { data: genres } = useGenres()
  const { data: informers } = useInformersList()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearchQuery(q)
  }

  const handleReset = () => {
    setQ('')
    setSearchQuery('')
    setType('')
    setMyStatus('')
    setDownloadStatus('')
    setGenre('')
    setInformer('')
    setIsFavorite(false)
    setIsAnime(false)
    setPage(1)
  }

  const hasFilters = Boolean(
    searchQuery || type || myStatus || downloadStatus || genre || informer || isFavorite || isAnime,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative" ref={menuRef}>
          <Button
            type="button"
            size="icon"
            onClick={() => setMenuOpen((v) => !v)}
            title="Создать"
            aria-label="Создать"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Plus />
          </Button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 z-50 mt-2 w-40 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <Link
                to="/media/new"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                Создать
              </Link>
              <Link
                to="/media/search"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                Импортировать
              </Link>
            </div>
          )}
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <Button type="submit">Поиск</Button>
        </form>
        <Select value={type} onValueChange={(v) => { setType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={cn('w-28', type && 'border-primary')}><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="movie">Фильмы</SelectItem>
            <SelectItem value="series">Сериалы</SelectItem>
          </SelectContent>
        </Select>
        <Select value={myStatus} onValueChange={(v) => { setMyStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={cn('w-32', myStatus && 'border-primary')}><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="plan_to_watch">Планирую</SelectItem>
            <SelectItem value="watching">Смотрю</SelectItem>
            <SelectItem value="dropped">Бросил</SelectItem>
            <SelectItem value="completed">Просмотрено</SelectItem>
          </SelectContent>
        </Select>
        <Select value={downloadStatus} onValueChange={(v) => { setDownloadStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={cn('w-36', downloadStatus && 'border-primary')}><SelectValue placeholder="Загрузка" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="none">Нет</SelectItem>
            <SelectItem value="need_download">Скачать</SelectItem>
            <SelectItem value="downloaded">Скачано</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genre} onValueChange={(v) => { setGenre(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={cn('w-32', genre && 'border-primary')}><SelectValue placeholder="Жанр" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {genres?.map((g: { slug: string; name: string }) => (
              <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={informer} onValueChange={(v) => { setInformer(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className={cn('w-36', informer && 'border-primary')}><SelectValue placeholder="Информатор" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {informers?.map((inf: { id: number; name: string }) => (
              <SelectItem key={inf.id} value={String(inf.id)}>{inf.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={isFavorite ? 'default' : 'outline'}
          size="sm"
          aria-pressed={isFavorite}
          onClick={() => { setIsFavorite((v) => !v); setPage(1) }}
        >
          <Star fill={isFavorite ? 'currentColor' : 'none'} />
          Избранное
        </Button>
        <Button
          type="button"
          variant={isAnime ? 'default' : 'outline'}
          size="sm"
          aria-pressed={isAnime}
          onClick={() => { setIsAnime((v) => !v); setPage(1) }}
        >
          Аниме
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <X />
            Сбросить
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : data?.results?.length ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Всего: {data.count}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {data.results.map((entry: MediaEntry) => (
              <MediaCard key={entry.id} entry={entry} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            onChange={(p) => {
              setPage(p)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </div>
      ) : hasFilters ? (
        <div className="space-y-2 text-muted-foreground">
          <p>При данной фильтрации ничего не найдено</p>
          <div className="flex flex-wrap items-center gap-2">
            <span>Попробуйте изменить фильтрацию или</span>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              Сбросить фильтры
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
