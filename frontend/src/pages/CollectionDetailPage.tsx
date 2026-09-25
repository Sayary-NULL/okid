import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useCollectionDetail, useUpdateCollection, useDeleteCollection,
  useRemoveCollectionItem, useUpdateItemPosition, useMediaList,
  useAddCollectionItem, useSetCollectionPoster, useRemoveCollectionPoster,
} from '@/hooks/useApi'
import type { MediaEntry } from '@/types'
import { Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const collectionId = Number(id)
  const navigate = useNavigate()
  const { data: collection, isLoading } = useCollectionDetail(collectionId)
  const updateCollection = useUpdateCollection()
  const deleteCollection = useDeleteCollection()
  const removeItem = useRemoveCollectionItem()
  const updatePosition = useUpdateItemPosition()
  const addItem = useAddCollectionItem()
  const setPoster = useSetCollectionPoster()
  const removePoster = useRemoveCollectionPoster()

  const posterInputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')

  const trimmedSearch = search.trim()
  const { data: searchResults, isFetching: isSearching } = useMediaList(
    trimmedSearch ? { q: trimmedSearch } : undefined,
    trimmedSearch.length > 0,
  )
  const existingIds = new Set(
    (collection?.items || []).map((item: { media_entry: number }) => item.media_entry),
  )
  const candidates = (searchResults?.results || []).filter(
    (media: MediaEntry) => !existingIds.has(media.id),
  )

  const startEdit = () => {
    if (!collection) return
    setName(collection.name)
    setDescription(collection.description || '')
    setEditing(true)
  }

  const handleSave = async () => {
    await updateCollection.mutateAsync({ id: collectionId, data: { name, description } })
    setEditing(false)
  }

  const handleDelete = async () => {
    if (confirm('Удалить коллекцию?')) {
      await deleteCollection.mutateAsync(collectionId)
      navigate('/collections')
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    await removeItem.mutateAsync({ collectionId, itemId })
  }

  const handleAddItem = async (mediaEntryId: number) => {
    await addItem.mutateAsync({ collectionId, mediaEntryId })
  }

  const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await setPoster.mutateAsync({ id: collectionId, file })
    }
    e.target.value = ''
  }

  const handleMoveUp = async (itemId: number, currentPos: number) => {
    if (currentPos <= 0) return
    await updatePosition.mutateAsync({ collectionId, itemId, position: currentPos - 1 })
  }

  const handleMoveDown = async (itemId: number, currentPos: number) => {
    if (!collection?.items) return
    if (currentPos >= collection.items.length - 1) return
    await updatePosition.mutateAsync({ collectionId, itemId, position: currentPos + 1 })
  }

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>
  if (!collection) return <p className="text-destructive">Не найдено</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-muted">
        {collection.poster ? (
          <img
            src={collection.poster}
            alt={collection.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Постер не установлен
          </div>
        )}
        <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/80 via-black/50 to-transparent px-4 pt-3 pb-10">
          <h1 className="text-2xl font-bold text-white">{collection.name}</h1>
        </div>
        {collection.description && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-gray-600/80 via-gray-600/40 to-transparent px-4 pb-3 pt-10">
            <p className="text-sm text-white">{collection.description}</p>
          </div>
        )}
        {!editing && (
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/collections')}
              title="Закрыть"
              aria-label="Закрыть"
            >
              <X />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={startEdit}
              title="Редактировать"
              aria-label="Редактировать"
            >
              <Pencil />
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
          </div>
        )}
      </div>

      {editing && (
        <div className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Сохранить</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Отмена</Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => posterInputRef.current?.click()}
              disabled={setPoster.isPending}
            >
              {collection.poster ? 'Изменить постер' : 'Установить постер'}
            </Button>
            {collection.poster && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removePoster.mutate(collectionId)}
                disabled={removePoster.isPending}
              >
                Удалить постер
              </Button>
            )}
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePosterChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">Широкий постер, рекомендуется 16:9</p>
        </div>
      )}

      {!editing && (
        <>
          <div className="space-y-2">
            <Input
              placeholder="Найти медиа для добавления..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {trimmedSearch && (
              <div className="space-y-1">
                {isSearching && <p className="text-xs text-muted-foreground">Поиск...</p>}
                {!isSearching && candidates.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ничего не найдено</p>
                )}
                {candidates.map((media: MediaEntry) => (
                  <div
                    key={media.id}
                    className="flex items-center justify-between gap-3 rounded border p-2"
                  >
                    <span className="text-sm truncate">{media.title}</span>
                    <Button size="sm" variant="outline" onClick={() => handleAddItem(media.id)}>
                      Добавить
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {collection.items?.map((item: { id: number; media_entry_detail: { id: number; title: string; poster_url?: string; poster_local?: string; media_type: string; year_start: number | null }; position: number }) => (
          <Card key={item.id}>
            <CardContent className="p-3 flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMoveUp(item.id, item.position)}>↑</Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleMoveDown(item.id, item.position)}>↓</Button>
              </div>
              <Link to={`/media/${item.media_entry_detail.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:underline">
                {item.media_entry_detail.poster_local || item.media_entry_detail.poster_url ? (
                  <img
                    src={item.media_entry_detail.poster_local || item.media_entry_detail.poster_url}
                    alt=""
                    className="w-10 h-14 object-cover rounded"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium truncate">{item.media_entry_detail.title}</p>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">{item.media_entry_detail.media_type}</Badge>
                    {item.media_entry_detail.year_start && <Badge variant="outline" className="text-xs">{item.media_entry_detail.year_start}</Badge>}
                  </div>
                </div>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}>✕</Button>
            </CardContent>
          </Card>
        ))}
          </div>
        </>
      )}
    </div>
  )
}