import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCreateCollection, useFranchises } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function FranchisesPage() {
  const [q, setQ] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const params: Record<string, string> = {}
  if (searchQuery) params.q = searchQuery
  const { data, isLoading } = useFranchises(params)
  const createCollection = useCreateCollection()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [open, setOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(q)
  }

  const handleCreate = async () => {
    if (!name) return
    await createCollection.mutateAsync({ name, description, is_universe: true })
    setName('')
    setDescription('')
    setOpen(false)
  }

  const franchises = data?.results || data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" title="Создать франшизу" aria-label="Создать франшизу"><Plus /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новая франшиза</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button onClick={handleCreate}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Поиск..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <Button type="submit">Поиск</Button>
        </form>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : Array.isArray(franchises) && franchises.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {franchises.map((col: { id: number; name: string; description: string; poster?: string | null; item_count?: number }) => (
            <Link key={col.id} to={`/franchises/${col.id}`}>
              <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="aspect-[16/9] w-full bg-muted">
                  {col.poster && (
                    <img src={col.poster} alt={col.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <CardContent className="p-4 space-y-1">
                  <p className="font-medium">{col.name}</p>
                  <p className="text-xs text-muted-foreground">{col.item_count ?? 0} элементов</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : searchQuery ? (
        <p className="text-muted-foreground">При данной фильтрации ничего не найдено</p>
      ) : (
        <p className="text-muted-foreground">
          Франшиз пока нет. Свяжите два медиа на вкладке «Связанное».
        </p>
      )}
    </div>
  )
}
