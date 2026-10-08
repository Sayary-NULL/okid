import { Link } from 'react-router-dom'
import { useFranchises } from '@/hooks/useApi'
import { Card, CardContent } from '@/components/ui/card'

export default function FranchisesPage() {
  const { data, isLoading } = useFranchises()
  const franchises = data?.results || data || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Франшизы</h1>

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
      ) : (
        <p className="text-muted-foreground">
          Франшиз пока нет. Свяжите два медиа на вкладке «Связанное».
        </p>
      )}
    </div>
  )
}
