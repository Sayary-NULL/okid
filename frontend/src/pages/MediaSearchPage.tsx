import { useState } from 'react'
import { useSearch, useImport } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MediaDetail } from '@/components/MediaDetail'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { SearchResult } from '@/types'

const mediaTypeLabels: Record<string, string> = {
  movie: 'Фильм',
  series: 'Сериал',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  )
}

export default function MediaSearchPage() {
  const search = useSearch()
  const importMedia = useImport()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [source, setSource] = useState<'poiskkino' | 'shikimori'>('poiskkino')
  const [year, setYear] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [importedId, setImportedId] = useState<number | null>(null)

  const runSearch = async (src: 'poiskkino' | 'shikimori') => {
    setSource(src)
    const data = await search.mutateAsync({
      query,
      type,
      year: year ? Number(year) : undefined,
      source: src,
    })
    setResults(data.results)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(source)
  }

  const handleImport = async (result: SearchResult) => {
    const { entry, created } = await importMedia.mutateAsync({
      title: result.title,
      original_title: result.original_title || '',
      media_type: result.media_type || (type === 'all' ? 'movie' : type),
      is_anime: result.is_anime ?? (source === 'shikimori'),
      year_start: result.year_start || result.year,
      year_end: result.year_end,
      poster_url: result.poster_url,
      description: result.description || '',
      short_description: result.short_description || '',
      rating_kp: result.rating_kp,
      rating_imdb: result.rating_imdb,
      rating_tmdb: result.rating_tmdb,
      rating_shikimori: result.rating_shikimori,
      external_pk_id: result.external_pk_id || '',
      external_shikimori_id: result.external_shikimori_id || '',
      external_links: result.external_links || [],
      movie_length: result.movie_length,
      is_series: result.is_series,
      total_series_length: result.total_series_length,
      series_length: result.series_length,
      status: result.status,
      genres: result.genres || [],
      countries: result.countries || [],
      my_status: 'plan_to_watch',
      download_status: 'none',
    })
    if (!created) {
      alert('Запись о текущем медиа уже существует!')
    }
    setImportedId(entry.id)
  }

  const closeModal = () => {
    setSelected(null)
    setImportedId(null)
  }

  const modalDetailId = importedId ?? selected?.existing_entry_id ?? null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Поиск во внешних архивах</h1>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Введите название" className="w-60" />
        </div>
        <div className="space-y-2">
          <Label>Тип</Label>
          <div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="movie">Фильм</SelectItem>
                <SelectItem value="series">Сериал</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Год</Label>
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" />
        </div>
        <Button
          type="button"
          onClick={() => runSearch('poiskkino')}
          disabled={search.isPending || !query}
        >
          ПоискКино
        </Button>
        <Button
          type="button"
          onClick={() => runSearch('shikimori')}
          disabled={search.isPending || !query}
        >
          Шикимори
        </Button>
      </form>

      <div className="space-y-3">
        {results.map((result, idx) => (
          <Card
            key={idx}
            role="button"
            tabIndex={0}
            onClick={() => { setImportedId(null); setSelected(result) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setImportedId(null)
                setSelected(result)
              }
            }}
            className="cursor-pointer transition-colors hover:bg-accent/50"
          >
            <CardContent className="p-4 flex gap-4 items-start">
              {result.poster_url && (
                <img src={result.poster_url} alt="" className="w-16 h-24 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{result.title}</p>
                  {result.existing_entry_id != null && (
                    <Badge variant="secondary" className="shrink-0">В библиотеке</Badge>
                  )}
                </div>
                {result.original_title && <p className="text-sm text-muted-foreground">{result.original_title}</p>}
                <p className="text-xs text-muted-foreground">{result.year}</p>
                {result.genres && result.genres.length > 0 && (
                  <p className="text-xs text-muted-foreground">{result.genres.join(', ')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {modalDetailId !== null ? 'Карточка медиа' : 'Импорт медиа'}
          </DialogTitle>
          {selected !== null && (
            modalDetailId !== null ? (
              <MediaDetail mediaId={modalDetailId} onClose={closeModal} isModal />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  {selected.poster_url && (
                    <img
                      src={selected.poster_url}
                      alt=""
                      className="w-32 h-48 object-cover rounded shrink-0"
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-xl font-bold">{selected.title}</h2>
                    {selected.original_title && (
                      <p className="text-sm text-muted-foreground">{selected.original_title}</p>
                    )}
                    <p className="text-sm">
                      {[selected.year, mediaTypeLabels[selected.media_type]].filter(Boolean).join(' · ')}
                    </p>
                    {selected.external_links && selected.external_links.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selected.external_links.map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {link.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <InfoRow label="Рейтинг КП" value={selected.rating_kp} />
                  <InfoRow label="Рейтинг IMDb" value={selected.rating_imdb} />
                  <InfoRow label="Рейтинг TMDB" value={selected.rating_tmdb} />
                  <InfoRow label="Рейтинг Shikimori" value={selected.rating_shikimori} />
                  <InfoRow label="Статус" value={selected.status} />
                  <InfoRow
                    label="Жанры"
                    value={selected.genres && selected.genres.length > 0 ? selected.genres.join(', ') : null}
                  />
                  <InfoRow
                    label="Страны"
                    value={selected.countries && selected.countries.length > 0 ? selected.countries.join(', ') : null}
                  />
                </div>

                {selected.short_description && (
                  <p className="text-sm">{selected.short_description}</p>
                )}
                {selected.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.description}</p>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleImport(selected)}
                    disabled={importMedia.isPending}
                  >
                    Загрузить
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
