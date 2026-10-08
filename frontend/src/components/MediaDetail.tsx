import {
  useMediaDetail, useHistory, useInformers, useDeleteMedia,
  useCreateHistory, useCreateInformer, useDeleteInformer,
  useToggleFavorite, useInformersList, useUpdateMedia,
  useDeleteHistory, useMediaList, useLinkUniverse,
  useCollectionDetail, useRemoveCollectionItem, useUpdateItemPosition,
} from '@/hooks/useApi'
import type { CollectionItem, DownloadStatus, Informer, MyStatus } from '@/types'
import { Pencil, Trash2, Star, X, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { WatchStatusIcon, watchStatusLabels } from '@/components/WatchStatusIcon'
import { SiteRating } from '@/components/SiteRating'
import { UserRating } from '@/components/UserRating'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const statusOrder: MyStatus[] = ['plan_to_watch', 'watching', 'dropped', 'completed']
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

export function MediaDetail({
  mediaId,
  onClose,
  onEdit,
  isModal = false,
}: {
  mediaId: number
  onClose: () => void
  onEdit?: () => void
  isModal?: boolean
}) {
  const { data: entry, isLoading } = useMediaDetail(mediaId)
  const { data: history } = useHistory(mediaId)
  const { data: informers } = useInformers(mediaId)
  const { data: allInformers } = useInformersList()
  const deleteMedia = useDeleteMedia()
  const createHistory = useCreateHistory()
  const deleteHistory = useDeleteHistory()
  const createInformer = useCreateInformer()
  const deleteInformer = useDeleteInformer()
  const toggleFavorite = useToggleFavorite()
  const updateMedia = useUpdateMedia()
  const linkUniverse = useLinkUniverse()
  const removeUniverseItem = useRemoveCollectionItem()
  const updateUniversePosition = useUpdateItemPosition()

  const [informerName, setInformerName] = useState('')
  const [universeQuery, setUniverseQuery] = useState('')
  const [linkError, setLinkError] = useState('')

  const universeId = entry?.universe_collection_id ?? 0
  const { data: franchise } = useCollectionDetail(universeId)

  const trimmedUniverse = universeQuery.trim()
  const { data: universeResults, isFetching: isUniverseSearching } = useMediaList(
    trimmedUniverse ? { q: trimmedUniverse } : undefined,
    trimmedUniverse.length > 0,
  )

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>
  if (!entry) return <p className="text-destructive">Не найдено</p>

  const posterSrc = entry.poster_local || entry.poster_url
  const franchiseItems: CollectionItem[] = franchise?.items || []
  const memberIds = new Set(franchiseItems.map((item) => item.media_entry))
  const universeCandidates = (universeResults?.results || []).filter(
    (m: { id: number }) => m.id !== entry.id && !memberIds.has(m.id),
  )

  const handleLinkUniverse = async (mediaEntryId: number) => {
    setLinkError('')
    try {
      await linkUniverse.mutateAsync({ id: mediaId, mediaEntryId })
      setUniverseQuery('')
    } catch (err) {
      const message = (
        err as { response?: { data?: { error?: string } } }
      ).response?.data?.error
      setLinkError(message || 'Не удалось связать медиа')
    }
  }

  const handleRemoveUniverse = async (itemId: number) => {
    await removeUniverseItem.mutateAsync({ collectionId: universeId, itemId })
  }

  const handleUniverseMoveUp = async (itemId: number, position: number) => {
    if (position <= 0) return
    await updateUniversePosition.mutateAsync({
      collectionId: universeId,
      itemId,
      position: position - 1,
    })
  }

  const handleUniverseMoveDown = async (itemId: number, position: number) => {
    if (position >= franchiseItems.length - 1) return
    await updateUniversePosition.mutateAsync({
      collectionId: universeId,
      itemId,
      position: position + 1,
    })
  }

  const handleDelete = async () => {
    if (confirm('Удалить запись?')) {
      await deleteMedia.mutateAsync(mediaId)
      onClose()
    }
  }

  const handleAddHistory = async (status: string) => {
    if (status === entry.my_status) return
    await createHistory.mutateAsync({
      id: mediaId,
      data: { old_status: entry.my_status, new_status: status },
    })
  }

  const handleRemoveHistory = async (historyId: number) => {
    await deleteHistory.mutateAsync({ id: mediaId, historyId })
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

  const handleCycleDownload = () => {
    updateMedia.mutate({
      id: mediaId,
      data: { download_status: downloadCycle[entry.download_status as DownloadStatus] },
    })
  }

  return (
    <div className="space-y-6">
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
            <WatchStatusIcon status={entry.my_status} />
          </div>
          <UserRating
            value={entry.my_rating}
            disabled={updateMedia.isPending}
            onRate={(rating) => updateMedia.mutate({ id: mediaId, data: { my_rating: rating } })}
          />
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
            onClick={onClose}
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
          {isModal ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              title="Редактировать"
              aria-label="Редактировать"
            >
              <Pencil />
            </Button>
          ) : (
            <Button variant="outline" size="icon" asChild title="Редактировать" aria-label="Редактировать">
              <Link to={`/media/${entry.id}/edit`}><Pencil /></Link>
            </Button>
          )}
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
          {isModal && (
            <Button variant="outline" size="icon" asChild title="Открыть в новом окне" aria-label="Открыть в новом окне">
              <a
                href={`/media/${entry.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
              </a>
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            title="Удалить"
            aria-label="Удалить"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="informers">Информаторы</TabsTrigger>
          <TabsTrigger value="collections">Коллекции</TabsTrigger>
          <TabsTrigger value="related">Связанное</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {statusOrder.map((status) => (
              <Button
                key={status}
                variant={entry.my_status === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleAddHistory(status)}
              >
                {watchStatusLabels[status]}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            {history?.map((h: { id: number; old_status: string; new_status: string; created_at: string }) => (
              <p key={h.id} className="text-sm flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString('ru-RU')}
                </span>
                <span>
                  {watchStatusLabels[h.new_status as MyStatus] || h.new_status}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveHistory(h.id)}
                  aria-label="Удалить запись истории"
                  className="rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="h-3 w-3" />
                </button>
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
          {entry.collections?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entry.collections.map((col: { id: number; name: string; poster?: string | null }) => (
                <Link key={col.id} to={`/collections/${col.id}`}>
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                    {col.poster && (
                      <img src={col.poster} alt={col.name} className="h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-gray-600/80 via-gray-600/40 to-transparent px-3 pb-2 pt-8">
                      <p className="text-sm font-medium text-white truncate">{col.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Медиа не входит ни в одну коллекцию</p>
          )}
        </TabsContent>

        <TabsContent value="related" className="space-y-3">
          <div className="space-y-2">
            <Input
              placeholder="Найти медиа для связи..."
              value={universeQuery}
              onChange={(e) => {
                setUniverseQuery(e.target.value)
                setLinkError('')
              }}
            />
            {linkError && <p className="text-sm text-destructive">{linkError}</p>}
            {trimmedUniverse && (
              <div className="space-y-1">
                {isUniverseSearching && (
                  <p className="text-xs text-muted-foreground">Поиск...</p>
                )}
                {!isUniverseSearching && universeCandidates.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ничего не найдено</p>
                )}
                {universeCandidates.map((media: { id: number; title: string }) => (
                  <div
                    key={media.id}
                    className="flex items-center justify-between gap-3 rounded border p-2"
                  >
                    <span className="text-sm truncate">{media.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={linkUniverse.isPending}
                      onClick={() => handleLinkUniverse(media.id)}
                    >
                      Связать
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {franchiseItems.length ? (
            <div className="space-y-2">
              {franchiseItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleUniverseMoveUp(item.id, item.position)}
                        title="Выше"
                        aria-label="Выше"
                      >
                        ↑
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleUniverseMoveDown(item.id, item.position)}
                        title="Ниже"
                        aria-label="Ниже"
                      >
                        ↓
                      </Button>
                    </div>
                    <Link
                      to={`/media/${item.media_entry_detail.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:underline"
                    >
                      {item.media_entry_detail.poster_local || item.media_entry_detail.poster_url ? (
                        <img
                          src={item.media_entry_detail.poster_local || item.media_entry_detail.poster_url}
                          alt=""
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="font-medium break-words">{item.media_entry_detail.title}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {mediaTypeLabels[item.media_entry_detail.media_type] || item.media_entry_detail.media_type}
                          </Badge>
                          {item.media_entry_detail.year_start && (
                            <Badge variant="outline" className="text-xs">
                              {item.media_entry_detail.year_start}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveUniverse(item.id)}
                      title="Убрать из связанных"
                      aria-label={`Убрать ${item.media_entry_detail.title} из связанных`}
                    >
                      ✕
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Медиа пока ни с чем не связано</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
