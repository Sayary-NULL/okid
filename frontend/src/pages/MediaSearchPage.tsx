import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch, useImport } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { SearchResult } from '@/types'

export default function MediaSearchPage() {
  const navigate = useNavigate()
  const search = useSearch()
  const importMedia = useImport()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [source, setSource] = useState<'poiskkino' | 'shikimori'>('poiskkino')
  const [year, setYear] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

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
    const entry = await importMedia.mutateAsync({
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
      external_kp_id: result.external_kp_id || '',
      external_imdb_id: result.external_imdb_id || '',
      external_tmdb_id: result.external_tmdb_id || '',
      external_shikimori_id: result.external_shikimori_id || '',
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
    navigate(`/media/${entry.id}`)
  }

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
          <Card key={idx}>
            <CardContent className="p-4 flex gap-4 items-start">
              {result.poster_url && (
                <img src={result.poster_url} alt="" className="w-16 h-24 object-cover rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{result.title}</p>
                {result.original_title && <p className="text-sm text-muted-foreground">{result.original_title}</p>}
                <p className="text-xs text-muted-foreground">{result.year}</p>
                {result.genres && result.genres.length > 0 && (
                  <p className="text-xs text-muted-foreground">{result.genres.join(', ')}</p>
                )}
              </div>
              <Button size="sm" onClick={() => handleImport(result)} disabled={importMedia.isPending}>
                Загрузить
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}