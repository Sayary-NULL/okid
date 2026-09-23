import { Link } from 'react-router-dom'
import { useCollections, useCreateCollection } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useState } from 'react'

export default function CollectionsPage() {
  const { data, isLoading } = useCollections()
  const createCollection = useCreateCollection()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [open, setOpen] = useState(false)

  const handleCreate = async () => {
    if (!name) return
    await createCollection.mutateAsync({ name, description })
    setName('')
    setDescription('')
    setOpen(false)
  }

  const collections = data?.results || data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Коллекции</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Создать коллекцию</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая коллекция</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button onClick={handleCreate}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.isArray(collections) && collections.map((col: { id: number; name: string; description: string; item_count?: number }) => (
            <Link key={col.id} to={`/collections/${col.id}`}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-1">
                  <p className="font-medium">{col.name}</p>
                  {col.description && <p className="text-sm text-muted-foreground">{col.description}</p>}
                  <p className="text-xs text-muted-foreground">{col.item_count ?? 0} элементов</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}