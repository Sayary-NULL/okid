import { useNavigate } from 'react-router-dom'
import { useCreateMedia, useGenres, useCountries } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'

export default function MediaCreatePage() {
  const navigate = useNavigate()
  const createMedia = useCreateMedia()
  const { data: genres } = useGenres()
  const { data: countries } = useCountries()

  const [form, setForm] = useState({
    title: '',
    original_title: '',
    media_type: 'movie',
    description: '',
    short_description: '',
    year_start: '',
    year_end: '',
    my_status: 'plan_to_watch',
    download_status: 'none',
    my_rating: '',
    is_favorite: false,
    is_anime: false,
  })
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...form,
      year_start: form.year_start ? Number(form.year_start) : null,
      year_end: form.year_end ? Number(form.year_end) : null,
      my_rating: form.my_rating ? Number(form.my_rating) : null,
      genres: selectedGenres,
      countries: selectedCountries,
    }
    const entry = await createMedia.mutateAsync(data)
    navigate(`/media/${entry.id}`)
  }

  const toggleGenre = (slug: string) => {
    setSelectedGenres((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug],
    )
  }

  const toggleCountry = (name: string) => {
    setSelectedCountries((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Создать дело</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Название *</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Оригинальное название</Label>
          <Input value={form.original_title} onChange={(e) => setForm({ ...form, original_title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Фильм</SelectItem>
                <SelectItem value="series">Сериал</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Мой статус</Label>
            <Select value={form.my_status} onValueChange={(v) => setForm({ ...form, my_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="plan_to_watch">Планирую</SelectItem>
                <SelectItem value="watching">Смотрю</SelectItem>
                <SelectItem value="dropped">Бросил</SelectItem>
                <SelectItem value="completed">Просмотрено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Год начала</Label>
            <Input type="number" value={form.year_start} onChange={(e) => setForm({ ...form, year_start: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Год окончания</Label>
            <Input type="number" value={form.year_end} onChange={(e) => setForm({ ...form, year_end: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Статус загрузки</Label>
            <Select value={form.download_status} onValueChange={(v) => setForm({ ...form, download_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Нет</SelectItem>
                <SelectItem value="need_download">Нужно скачать</SelectItem>
                <SelectItem value="downloaded">Скачано</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Мой рейтинг</Label>
            <Input type="number" min={1} max={10} value={form.my_rating} onChange={(e) => setForm({ ...form, my_rating: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Жанры</Label>
          <div className="flex flex-wrap gap-2">
            {genres?.map((g: { slug: string; name: string }) => (
              <Button
                key={g.slug}
                type="button"
                size="sm"
                variant={selectedGenres.includes(g.slug) ? 'default' : 'outline'}
                onClick={() => toggleGenre(g.slug)}
              >
                {g.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Страны</Label>
          <div className="flex flex-wrap gap-2">
            {countries?.map((c: { id: number; name: string }) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={selectedCountries.includes(c.name) ? 'default' : 'outline'}
                onClick={() => toggleCountry(c.name)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_favorite"
            checked={form.is_favorite}
            onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })}
          />
          <Label htmlFor="is_favorite">Избранное</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_anime"
            checked={form.is_anime}
            onChange={(e) => setForm({ ...form, is_anime: e.target.checked })}
          />
          <Label htmlFor="is_anime">Аниме</Label>
        </div>
        <Button type="submit" className="w-full">Сдать в архив</Button>
      </form>
    </div>
  )
}