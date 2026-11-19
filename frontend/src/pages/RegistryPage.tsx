import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMediaList, useMediaLetters, useGenres, useInformersList, useToggleFavorite } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star, Download, Plus, X, Filter, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MediaDetail } from '@/components/MediaDetail'
import { MediaEditForm } from '@/components/MediaEditForm'
import { Pagination } from '@/components/Pagination'
import { WatchStatusIcon } from '@/components/WatchStatusIcon'
import { UserRatingBadge } from '@/components/UserRatingBadge'
import type { MediaEntry } from '@/types'

const mediaTypeLabels: Record<string, string> = {
  movie: 'Фильм',
  series: 'Сериал',
}

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

const animeLabels: Record<string, string> = {
  true: 'Аниме',
  false: 'Без аниме',
}

const downloadIconClasses: Record<string, string> = {
  need_download: 'bg-yellow-400 text-white',
  downloaded: 'bg-green-500 text-black',
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>
    </div>
  )
}

type SelectOption = { value: string; label: string }

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: SelectOption[]
}) {
  return (
    <div className="relative">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn('w-full', value && 'border-primary pr-7')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <button
          type="button"
          aria-label={`Сбросить: ${placeholder}`}
          title={`Сбросить: ${placeholder}`}
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function MediaCard({ entry, onOpen }: { entry: MediaEntry; onOpen: (id: number) => void }) {
  const posterSrc = entry.poster_local || entry.poster_url
  const toggleFavorite = useToggleFavorite()

  const handleToggleFavorite = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite.mutate({ id: entry.id, isFavorite: !entry.is_favorite })
  }

  const handleOpen = (e: ReactMouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    onOpen(entry.id)
  }

  return (
    <Link to={`/media/${entry.id}`} onClick={handleOpen} className="group block">
      <Card className="hover:shadow-lg transition-shadow overflow-hidden">
        <div className="aspect-[2/3] bg-muted relative">
          {posterSrc ? (
            <img src={posterSrc} alt={entry.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Нет постера</div>
          )}
          <div className="absolute left-2 top-2 flex items-center gap-1">
            <WatchStatusIcon status={entry.my_status} />
            {entry.download_status === 'downloaded' && (
              <span
                title={downloadLabels.downloaded}
                aria-label={downloadLabels.downloaded}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full shadow',
                  downloadIconClasses.downloaded,
                )}
              >
                <Download className="h-4 w-4" />
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-label={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={entry.is_favorite}
            className={cn(
              'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow transition-opacity',
              entry.is_favorite
                ? 'bg-yellow-400 text-white hover:bg-yellow-500 opacity-100'
                : 'bg-white text-black hover:bg-neutral-100 opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <Star className="h-4 w-4" fill={entry.is_favorite ? 'currentColor' : 'none'} />
          </button>
          {entry.my_rating != null && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5">
              <UserRatingBadge value={entry.my_rating} className="text-white" />
            </span>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="font-medium text-sm line-clamp-1" title={entry.title}>
            {entry.title}
          </p>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{mediaTypeLabels[entry.media_type] || entry.media_type}</span>
            {entry.year_start && <span>{entry.year_start}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
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
  const [isAnime, setIsAnime] = useState('')
  const [letter, setLetter] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!filtersOpen) return
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-radix-popper-content-wrapper]')) return
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filtersOpen])

  const params: Record<string, string> = {}
  if (searchQuery) params.q = searchQuery
  if (type) params.type = type
  if (myStatus) params.my_status = myStatus
  if (downloadStatus) params.download_status = downloadStatus
  if (genre) params.genre = genre
  if (informer) params.informer = informer
  if (isFavorite) params.is_favorite = 'true'
  if (isAnime) params.is_anime = isAnime
  if (letter) params.letter = letter
  if (page > 1) params.page = String(page)

  const { data, isLoading } = useMediaList(params)
  const { data: letters } = useMediaLetters()
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
    setIsAnime('')
    setLetter('')
    setPage(1)
  }

  const hasFilters = Boolean(
    searchQuery || type || myStatus || downloadStatus || genre || informer || isFavorite || isAnime || letter,
  )

  type FilterChip = { key: string; label: string; onRemove: () => void }
  const chips: FilterChip[] = []
  if (type) {
    chips.push({ key: 'type', label: mediaTypeLabels[type] || type, onRemove: () => { setType(''); setPage(1) } })
  }
  if (genre) {
    const genreName = genres?.find((g: { slug: string; name: string }) => g.slug === genre)?.name ?? genre
    chips.push({ key: 'genre', label: `Жанр: ${genreName}`, onRemove: () => { setGenre(''); setPage(1) } })
  }
  if (isAnime) {
    chips.push({ key: 'anime', label: animeLabels[isAnime] || isAnime, onRemove: () => { setIsAnime(''); setPage(1) } })
  }
  if (letter) {
    chips.push({ key: 'letter', label: `Буква: ${letter}`, onRemove: () => { setLetter(''); setPage(1) } })
  }
  if (myStatus) {
    chips.push({ key: 'status', label: statusLabels[myStatus] || myStatus, onRemove: () => { setMyStatus(''); setPage(1) } })
  }
  if (isFavorite) {
    chips.push({ key: 'favorite', label: 'Избранное', onRemove: () => { setIsFavorite(false); setPage(1) } })
  }
  if (downloadStatus) {
    chips.push({
      key: 'download',
      label: `Загрузка: ${downloadLabels[downloadStatus] || downloadStatus}`,
      onRemove: () => { setDownloadStatus(''); setPage(1) },
    })
  }
  if (informer) {
    const informerName = informers?.find((i: { id: number; name: string }) => String(i.id) === informer)?.name ?? informer
    chips.push({ key: 'informer', label: `Информатор: ${informerName}`, onRemove: () => { setInformer(''); setPage(1) } })
  }

  return (
    <div className="registry-page flex flex-col gap-6 pt-[72px]">
      <div className="fixed left-0 right-0 top-0 z-40 border-b bg-background md:left-64">
        <div className="flex h-[72px] items-center gap-2 px-4 md:px-6">
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

          <form onSubmit={handleSearch} className="min-w-0 flex-1 md:flex-none">
            <div className="relative w-full md:w-56">
              <Input
                placeholder="Поиск..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={cn('w-full', q.trim() && 'pr-11')}
              />
              {q.trim() && (
                <button
                  type="submit"
                  title="Найти"
                  aria-label="Найти"
                  className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border bg-muted text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-1.5 overflow-hidden md:flex">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                title={`Убрать: ${chip.label}`}
                aria-label={`Убрать фильтр ${chip.label}`}
                className="inline-flex min-w-0 shrink items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span className="truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>

          <div className="relative shrink-0" ref={filtersRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(chips.length > 0 && 'border-primary text-primary')}
            >
              <Filter />
              Фильтры
              {chips.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {chips.length}
                </span>
              )}
            </Button>

            {filtersOpen && (
              <div
                role="dialog"
                aria-label="Фильтры"
                className="absolute right-0 z-50 mt-2 max-h-[calc(100vh-84px)] w-[min(24rem,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
              >
                <FilterGroup title="Контент">
                  <FilterSelect
                    value={type}
                    placeholder="Тип"
                    onChange={(v) => { setType(v); setPage(1) }}
                    options={[
                      { value: 'movie', label: 'Фильмы' },
                      { value: 'series', label: 'Сериалы' },
                    ]}
                  />
                  <FilterSelect
                    value={genre}
                    placeholder="Жанр"
                    onChange={(v) => { setGenre(v); setPage(1) }}
                    options={(genres ?? []).map((g: { slug: string; name: string }) => ({ value: g.slug, label: g.name }))}
                  />
                  <FilterSelect
                    value={isAnime}
                    placeholder="Аниме"
                    onChange={(v) => { setIsAnime(v); setPage(1) }}
                    options={[
                      { value: 'true', label: 'Аниме' },
                      { value: 'false', label: 'Без аниме' },
                    ]}
                  />
                  {letters && letters.length > 0 && (
                    <div className="md:hidden">
                      <FilterSelect
                        value={letter}
                        placeholder="Буква"
                        onChange={(v) => { setLetter(v); setPage(1) }}
                        options={letters.map(({ letter: char }) => ({ value: char, label: char }))}
                      />
                    </div>
                  )}
                </FilterGroup>

                <FilterGroup title="Мой прогресс">
                  <FilterSelect
                    value={myStatus}
                    placeholder="Статус"
                    onChange={(v) => { setMyStatus(v); setPage(1) }}
                    options={[
                      { value: 'plan_to_watch', label: 'Планирую' },
                      { value: 'watching', label: 'Смотрю' },
                      { value: 'dropped', label: 'Бросил' },
                      { value: 'completed', label: 'Просмотрено' },
                    ]}
                  />
                  <Button
                    type="button"
                    variant={isFavorite ? 'default' : 'outline'}
                    aria-pressed={isFavorite}
                    onClick={() => { setIsFavorite((v) => !v); setPage(1) }}
                    className="justify-start"
                  >
                    <Star fill={isFavorite ? 'currentColor' : 'none'} />
                    Избранное
                  </Button>
                </FilterGroup>

                <FilterGroup title="Библиотека">
                  <FilterSelect
                    value={downloadStatus}
                    placeholder="Загрузка"
                    onChange={(v) => { setDownloadStatus(v); setPage(1) }}
                    options={[
                      { value: 'none', label: 'Нет' },
                      { value: 'need_download', label: 'Скачать' },
                      { value: 'downloaded', label: 'Скачано' },
                    ]}
                  />
                  <FilterSelect
                    value={informer}
                    placeholder="Информатор"
                    onChange={(v) => { setInformer(v); setPage(1) }}
                    options={(informers ?? []).map((inf: { id: number; name: string }) => ({ value: String(inf.id), label: inf.name }))}
                  />
                </FilterGroup>

                <div className="flex items-center justify-between border-t pt-3">
                  <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={!hasFilters}>
                    <X />
                    Сбросить
                  </Button>
                  <Button type="button" size="sm" onClick={() => setFiltersOpen(false)}>Готово</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {letters && letters.length > 0 && (
        <nav
          aria-label="Указатель по алфавиту"
          className="fixed right-1.5 top-[88px] bottom-4 z-30 hidden flex-col items-center justify-center gap-0.5 overflow-y-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {letters.map(({ letter: char, count }) => (
            <button
              key={char}
              type="button"
              onClick={() => {
                setLetter((current) => (current === char ? '' : char))
                setPage(1)
                document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              title={`${char} — ${count}`}
              aria-current={letter === char ? 'true' : undefined}
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium leading-none transition-colors',
                letter === char
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {char}
            </button>
          ))}
        </nav>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : data?.results?.length ? (
        <div className="space-y-6 md:pr-7">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {data.results.map((entry: MediaEntry) => (
              <MediaCard key={entry.id} entry={entry} onOpen={(id) => { setEditing(false); setDetailId(id) }} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            count={data.count}
            onChange={(p) => {
              setPage(p)
              document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
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

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => {
          if (open) return
          if (editing) setEditing(false)
          else setDetailId(null)
        }}
      >
        <DialogContent
          className={cn(
            'w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto',
            editing ? 'max-w-2xl' : 'max-w-4xl',
          )}
        >
          <DialogTitle className="sr-only">
            {editing ? 'Редактирование медиа' : 'Карточка медиа'}
          </DialogTitle>
          {detailId !== null && (
            editing ? (
              <MediaEditForm mediaId={detailId} onDone={() => setEditing(false)} />
            ) : (
              <MediaDetail
                mediaId={detailId}
                onClose={() => setDetailId(null)}
                onEdit={() => setEditing(true)}
                isModal
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
