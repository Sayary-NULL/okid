import { useParams, useNavigate } from 'react-router-dom'
import {
  useMediaDetail, useHistory, useInformers, useDeleteMedia, useSavePoster,
  useCreateHistory, useCreateInformer, useCollections, useAddCollectionItem,
} from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

export default function MediaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mediaId = Number(id)
  const navigate = useNavigate()
  const { data: entry, isLoading } = useMediaDetail(mediaId)
  const { data: history } = useHistory(mediaId)
  const { data: informers } = useInformers(mediaId)
  const { data: collections } = useCollections()
  const deleteMedia = useDeleteMedia()
  const savePoster = useSavePoster()
  const createHistory = useCreateHistory()
  const createInformer = useCreateInformer()
  const addCollectionItem = useAddCollectionItem()

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

  const handleSavePoster = async () => {
    await savePoster.mutateAsync(mediaId)
  }

  const handleAddHistory = async () => {
    if (!newStatus) return
    await createHistory.mutateAsync({
      id: mediaId,
      data: { old_status: entry.my_status, new_status: newStatus },
    })
    setNewStatus('')
  }

  const handleAddInformer = async () => {
    if (!informerName) return
    await createInformer.mutateAsync({ id: mediaId, data: { informer_name: informerName } })
    setInformerName('')
  }

  const handleAddToCollection = async (collectionId: number) => {
    await addCollectionItem.mutateAsync({ collectionId, mediaEntryId: mediaId })
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
            {entry.my_rating && <Badge variant="secondary">{entry.my_rating}/10</Badge>}
          </div>
          <div className="flex flex-wrap gap-1">
            {entry.genres?.map((g: { id: number; name: string }) => <Badge key={g.id} variant="outline">{g.name}</Badge>)}
          </div>
          {entry.description && <p className="text-sm">{entry.description}</p>}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {entry.rating_kp && <span>KP: {entry.rating_kp}</span>}
            {entry.rating_imdb && <span>IMDb: {entry.rating_imdb}</span>}
            {entry.rating_tmdb && <span>TMDB: {entry.rating_tmdb}</span>}
            {entry.rating_shikimori && <span>Shikimori: {entry.rating_shikimori}</span>}
          </div>
          <div className="flex gap-2">
            <Link to={`/media/${entry.id}/edit`}><Button variant="outline">Редактировать</Button></Link>
            <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
            {entry.poster_url && !entry.poster_local && (
              <Button variant="outline" onClick={handleSavePoster} disabled={savePoster.isPending}>
                Сохранить постер локально
              </Button>
            )}
          </div>
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
          <div className="flex gap-2">
            <Input
              placeholder="Кто порекомендовал?"
              value={informerName}
              onChange={(e) => setInformerName(e.target.value)}
            />
            <Button onClick={handleAddInformer} disabled={!informerName}>Добавить</Button>
          </div>
          <div className="space-y-1">
            {informers?.map((inf: { id: number; informer_name: string; created_at: string }) => (
              <p key={inf.id} className="text-sm text-muted-foreground">
                {new Date(inf.created_at).toLocaleString('ru-RU')} — {inf.informer_name}
              </p>
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