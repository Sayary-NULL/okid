import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
      <div className="flex items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" title="Создать коллекцию" aria-label="Создать коллекцию"><Plus /></Button>
          </DialogTrigger>
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
        <h1 className="text-2xl font-bold">Коллекции</h1>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.isArray(collections) && collections.map((col: { id: number; name: string; description: string; poster?: string | null; item_count?: number }) => (
            <Link key={col.id} to={`/collections/${col.id}`}>
              <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="aspect-[16/9] w-full bg-muted">
                  {col.poster && (
                    <img src={col.poster} alt={col.name} className="h-full w-full object-cover" />
                  )}
                </div>
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