import { useParams, useNavigate } from 'react-router-dom'
import { useMediaDetail, useUpdateMedia, useSavePoster } from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState, useEffect } from 'react'

export default function MediaEditPage() {
  const { id } = useParams<{ id: string }>()
  const mediaId = Number(id)
  const navigate = useNavigate()
  const { data: entry, isLoading } = useMediaDetail(mediaId)
  const updateMedia = useUpdateMedia()
  const savePoster = useSavePoster()

  const [title, setTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [mediaType, setMediaType] = useState('movie')
  const [description, setDescription] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [isAnime, setIsAnime] = useState(false)

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setOriginalTitle(entry.original_title || '')
      setMediaType(entry.media_type)
      setDescription(entry.description || '')
      setYearStart(entry.year_start?.toString() || '')
      setYearEnd(entry.year_end?.toString() || '')
      setIsAnime(entry.is_anime)
    }
  }, [entry])

  const handleSavePoster = async () => {
    await savePoster.mutateAsync(mediaId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateMedia.mutateAsync({
      id: mediaId,
      data: {
        title,
        original_title: originalTitle,
        media_type: mediaType,
        description,
        year_start: yearStart ? Number(yearStart) : null,
        year_end: yearEnd ? Number(yearEnd) : null,
        is_anime: isAnime,
      },
    })
    navigate(`/media/${mediaId}`)
  }

  const handleCancel = () => {
    navigate(`/media/${mediaId}`)
  }

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Редактировать дело</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Оригинальное название</Label>
          <Input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Тип</Label>
          <Select value={mediaType} onValueChange={(v) => { if (v) setMediaType(v) }}>
            <SelectTrigger>
              <SelectValue>{mediaType === 'series' ? 'Сериал' : 'Фильм'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Фильм</SelectItem>
              <SelectItem value="series">Сериал</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Год начала</Label>
            <Input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Год окончания</Label>
            <Input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_anime" checked={isAnime} onChange={(e) => setIsAnime(e.target.checked)} />
          <Label htmlFor="is_anime">Аниме</Label>
        </div>
        {entry?.poster_url && !entry.poster_local && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSavePoster}
            disabled={savePoster.isPending}
          >
            Сохранить постер локально
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
            Отмена
          </Button>
          <Button type="submit" className="flex-1">Сохранить</Button>
        </div>
      </form>
    </div>
  )
}