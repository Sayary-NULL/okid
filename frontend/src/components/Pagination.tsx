import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Pagination({
  page,
  totalPages,
  count,
  onChange,
}: {
  page: number
  totalPages: number
  count: number
  onChange: (page: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {totalPages > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Первая страница"
            disabled={page <= 1}
            onClick={() => onChange(1)}
          >
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Назад"
            disabled={page <= 1}
            onClick={() => onChange(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            {page} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Вперёд"
            disabled={page >= totalPages}
            onClick={() => onChange(page + 1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Последняя страница"
            disabled={page >= totalPages}
            onClick={() => onChange(totalPages)}
          >
            <ChevronsRight />
          </Button>
        </>
      )}
      <span className="ml-2 text-sm text-muted-foreground">Записей: {count}</span>
    </div>
  )
}
