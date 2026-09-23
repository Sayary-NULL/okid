import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useCollectionDetail, useUpdateCollection, useDeleteCollection,
  useRemoveCollectionItem, useUpdateItemPosition,
} from '@/hooks/useApi'
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

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

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
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>Сохранить</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Отмена</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={startEdit}>Редактировать</Button>
                <Button size="sm" variant="destructive" onClick={handleDelete}>Удалить</Button>
              </div>
            </>
          )}
        </div>
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
    </div>
  )
}