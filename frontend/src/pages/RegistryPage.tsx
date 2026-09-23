import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMediaList, useGenres, useInformersList, useToggleFavorite } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
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

function MediaCard({ entry }: { entry: MediaEntry }) {
  const posterSrc = entry.poster_local || entry.poster_url
  const toggleFavorite = useToggleFavorite()

  const handleToggleFavorite = (e: MouseEvent) => {
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
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="font-medium text-sm line-clamp-1">{entry.title}</p>
          <p className="text-xs text-muted-foreground">{entry.year_start}</p>
          <div className="flex items-center gap-1 flex-wrap">
            {entry.my_rating && <Badge variant="secondary">{entry.my_rating}/10</Badge>}
            <Badge>{statusLabels[entry.my_status] || entry.my_status}</Badge>
            {entry.download_status !== 'none' && (
              <Badge variant="outline">{downloadLabels[entry.download_status]}</Badge>
            )}
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
  const [isFavorite, setIsFavorite] = useState('')
  const [isAnime, setIsAnime] = useState('')

  const params: Record<string, string> = {}
  if (searchQuery) params.q = searchQuery
  if (type) params.type = type
  if (myStatus) params.my_status = myStatus
  if (downloadStatus) params.download_status = downloadStatus
  if (genre) params.genre = genre
  if (informer) params.informer = informer
  if (isFavorite) params.is_favorite = isFavorite
  if (isAnime) params.is_anime = isAnime

  const { data, isLoading } = useMediaList(params)
  const { data: genres } = useGenres()
  const { data: informers } = useInformersList()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(q)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <Button type="submit">Поиск</Button>
        </form>
        <Select value={type} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="movie">Фильмы</SelectItem>
            <SelectItem value="series">Сериалы</SelectItem>
          </SelectContent>
        </Select>
        <Select value={myStatus} onValueChange={(v) => setMyStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="plan_to_watch">Планирую</SelectItem>
            <SelectItem value="watching">Смотрю</SelectItem>
            <SelectItem value="dropped">Бросил</SelectItem>
            <SelectItem value="completed">Просмотрено</SelectItem>
          </SelectContent>
        </Select>
        <Select value={downloadStatus} onValueChange={(v) => setDownloadStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Загрузка" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="none">Нет</SelectItem>
            <SelectItem value="need_download">Скачать</SelectItem>
            <SelectItem value="downloaded">Скачано</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genre} onValueChange={(v) => setGenre(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Жанр" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {genres?.map((g: { slug: string; name: string }) => (
              <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={informer} onValueChange={(v) => setInformer(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Информатор" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {informers?.map((inf: { id: number; name: string }) => (
              <SelectItem key={inf.id} value={String(inf.id)}>{inf.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isFavorite} onValueChange={(v) => setIsFavorite(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Избранное" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="true">Избранное</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isAnime} onValueChange={(v) => setIsAnime(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Аниме" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="true">Аниме</SelectItem>
          </SelectContent>
        </Select>
        <Link to="/media/new"><Button variant="outline">Создать дело</Button></Link>
        <Link to="/media/search"><Button variant="outline">Поиск во внешних архивах</Button></Link>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {data?.results?.map((entry: MediaEntry) => (
            <MediaCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}