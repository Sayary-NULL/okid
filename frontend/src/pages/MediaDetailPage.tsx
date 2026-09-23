import { useParams, useNavigate } from 'react-router-dom'
import {
  useMediaDetail, useHistory, useInformers, useDeleteMedia,
  useCreateHistory, useCreateInformer, useDeleteInformer, useCollections,
  useAddCollectionItem, useToggleFavorite, useInformersList, useUpdateMedia,
} from '@/hooks/useApi'
import type { DownloadStatus, Informer } from '@/types'
import { Pencil, Trash2, Star, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SiteRating, ratingColor } from '@/components/SiteRating'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const statusLabels: Record<string, string> = {
  plan_to_watch: 'Планирую', watching: 'Смотрю', dropped: 'Бросил', completed: 'Просмотрено',
}
const mediaTypeLabels: Record<string, string> = {
  movie: 'Фильм', series: 'Сериал',
}
const downloadCycle: Record<DownloadStatus, DownloadStatus> = {
  none: 'need_download',
  need_download: 'downloaded',
  downloaded: 'none',
}
const downloadTitles: Record<string, string> = {
  none: 'Нет',
  need_download: 'Скачать',
  downloaded: 'Скачано',
}
const downloadButtonClasses: Record<string, string> = {
  none: 'border-transparent bg-white text-black hover:bg-neutral-100 hover:text-black',
  need_download: 'border-transparent bg-yellow-400 text-white hover:bg-yellow-500 hover:text-white',
  downloaded: 'border-transparent bg-green-500 text-black hover:bg-green-600 hover:text-black',
}

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mediaId = Number(id)
  const navigate = useNavigate()
  const { data: entry, isLoading } = useMediaDetail(mediaId)
  const { data: history } = useHistory(mediaId)
  const { data: informers } = useInformers(mediaId)
  const { data: allInformers } = useInformersList()
  const { data: collections } = useCollections()
  const deleteMedia = useDeleteMedia()
  const createHistory = useCreateHistory()
  const createInformer = useCreateInformer()
  const deleteInformer = useDeleteInformer()
  const addCollectionItem = useAddCollectionItem()
  const toggleFavorite = useToggleFavorite()
  const updateMedia = useUpdateMedia()

  const [newStatus, setNewStatus] = useState('')
  const [informerName, setInformerName] = useState('')

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>
  if (!entry) return <p className="text-destructive">Не найдено</p>

  const posterSrc = entry.poster_local || entry.poster_url

  const handleDelete = async () => {
    if (confirm('Удалить запись?')) {
      await deleteMedia.mutateAsync(mediaId)
      navigate('/')
    }
  }

  const handleAddHistory = async () => {
    if (!newStatus) return
    await createHistory.mutateAsync({
      id: mediaId,
      data: { old_status: entry.my_status, new_status: newStatus },
    })
    setNewStatus('')
  }

  const trimmedInformer = informerName.trim()
  const matchedInformer = allInformers?.find(
    (inf: Informer) => inf.name.toLowerCase() === trimmedInformer.toLowerCase(),
  )

  const handleAddInformer = async () => {
    if (!trimmedInformer) return
    await createInformer.mutateAsync({
      id: mediaId,
      data: matchedInformer
        ? { informer: matchedInformer.id }
        : { informer_name: trimmedInformer },
    })
    setInformerName('')
  }

  const handleRemoveInformer = async (informerId: number) => {
    await deleteInformer.mutateAsync({ id: mediaId, informerId })
  }

  const handleAddToCollection = async (collectionId: number) => {
    await addCollectionItem.mutateAsync({ collectionId, mediaEntryId: mediaId })
  }

  const handleCycleDownload = () => {
    updateMedia.mutate({
      id: mediaId,
      data: { download_status: downloadCycle[entry.download_status as DownloadStatus] },
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          {posterSrc ? (
            <img src={posterSrc} alt={entry.title} className="w-full rounded-lg shadow" />
          ) : (
            <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
              Нет постера
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold">{entry.title}</h1>
          {entry.original_title && <p className="text-muted-foreground">{entry.original_title}</p>}
          <div className="flex flex-wrap gap-2">
            <Badge>{mediaTypeLabels[entry.media_type] || entry.media_type}</Badge>
            {entry.is_anime && <Badge variant="secondary">Аниме</Badge>}
            {entry.year_start && <Badge variant="outline">{entry.year_start}{entry.year_end ? `–${entry.year_end}` : ''}</Badge>}
            <Badge>{statusLabels[entry.my_status] || entry.my_status}</Badge>
            {entry.my_rating && (
              <Badge variant="secondary" className={cn('tabular-nums', ratingColor(entry.my_rating))}>
                {entry.my_rating}/10
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {entry.genres?.map((g: { id: number; name: string }) => <Badge key={g.id} variant="outline">{g.name}</Badge>)}
          </div>
          {entry.description && <p className="text-sm">{entry.description}</p>}
          <div className="flex flex-wrap gap-3">
            {entry.rating_kp && <SiteRating site="kp" value={entry.rating_kp} />}
            {entry.rating_imdb && <SiteRating site="imdb" value={entry.rating_imdb} />}
            {entry.rating_tmdb && <SiteRating site="tmdb" value={entry.rating_tmdb} />}
            {entry.rating_shikimori && <SiteRating site="shikimori" value={entry.rating_shikimori} />}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
            title="Закрыть"
            aria-label="Закрыть"
          >
            <X />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleFavorite.mutate({ id: entry.id, isFavorite: !entry.is_favorite })}
            title={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-label={entry.is_favorite ? 'Убрать из избранного' : 'В избранное'}
            aria-pressed={entry.is_favorite}
            className={cn(
              entry.is_favorite
                ? 'border-transparent bg-yellow-400 text-white hover:bg-yellow-500 hover:text-white'
                : 'bg-white text-black hover:bg-neutral-100',
            )}
          >
            <Star fill={entry.is_favorite ? 'currentColor' : 'none'} />
          </Button>
          <Button variant="outline" size="icon" asChild title="Редактировать" aria-label="Редактировать">
            <Link to={`/media/${entry.id}/edit`}><Pencil /></Link>
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            title="Удалить"
            aria-label="Удалить"
          >
            <Trash2 />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCycleDownload}
            title={downloadTitles[entry.download_status]}
            aria-label={downloadTitles[entry.download_status]}
            className={cn(downloadButtonClasses[entry.download_status])}
          >
            <Download />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="informers">Информаторы</TabsTrigger>
          <TabsTrigger value="collections">Коллекции</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Новый статус</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="">Выбрать...</option>
                <option value="plan_to_watch">Планирую</option>
                <option value="watching">Смотрю</option>
                <option value="dropped">Бросил</option>
                <option value="completed">Просмотрено</option>
              </select>
            </div>
            <Button onClick={handleAddHistory} disabled={!newStatus}>Добавить</Button>
          </div>
          <div className="space-y-1">
            {history?.map((h: { id: number; old_status: string; new_status: string; created_at: string }) => (
              <p key={h.id} className="text-sm text-muted-foreground">
                {new Date(h.created_at).toLocaleString('ru-RU')} — {statusLabels[h.old_status] || h.old_status} → {statusLabels[h.new_status] || h.new_status}
              </p>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="informers" className="space-y-3">
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                list="informer-options"
                placeholder="Кто порекомендовал?"
                value={informerName}
                onChange={(e) => setInformerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddInformer()
                }}
              />
              <datalist id="informer-options">
                {allInformers?.map((inf: Informer) => (
                  <option key={inf.id} value={inf.name} />
                ))}
              </datalist>
              <Button onClick={handleAddInformer} disabled={!trimmedInformer}>Добавить</Button>
            </div>
            {trimmedInformer && !matchedInformer && (
              <p className="text-xs text-muted-foreground">
                Новый информатор «{trimmedInformer}» будет создан
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {informers?.map((inf: { id: number; informer: Informer; created_at: string }) => (
              <Badge
                key={inf.id}
                variant="secondary"
                className="gap-1 pr-1"
                title={new Date(inf.created_at).toLocaleString('ru-RU')}
              >
                {inf.informer.name}
                <button
                  type="button"
                  onClick={() => handleRemoveInformer(inf.id)}
                  aria-label={`Удалить информатора ${inf.informer.name}`}
                  className="rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collections" className="space-y-3">
          <div className="space-y-2">
            {collections?.results?.map((col: { id: number; name: string }) => (
              <div key={col.id} className="flex items-center justify-between">
                <Link to={`/collections/${col.id}`} className="text-sm hover:underline">{col.name}</Link>
                <Button size="sm" variant="outline" onClick={() => handleAddToCollection(col.id)}>
                  Добавить
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}