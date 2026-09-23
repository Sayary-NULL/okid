import { useParams, useNavigate } from 'react-router-dom'
import { useMediaDetail, useUpdateMedia } from '@/hooks/useApi'
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

  const [title, setTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [mediaType, setMediaType] = useState('movie')
  const [description, setDescription] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [myStatus, setMyStatus] = useState('plan_to_watch')
  const [downloadStatus, setDownloadStatus] = useState('none')
  const [myRating, setMyRating] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isAnime, setIsAnime] = useState(false)

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setOriginalTitle(entry.original_title || '')
      setMediaType(entry.media_type)
      setDescription(entry.description || '')
      setYearStart(entry.year_start?.toString() || '')
      setYearEnd(entry.year_end?.toString() || '')
      setMyStatus(entry.my_status)
      setDownloadStatus(entry.download_status)
      setMyRating(entry.my_rating?.toString() || '')
      setIsFavorite(entry.is_favorite)
      setIsAnime(entry.is_anime)
    }
  }, [entry])

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
        my_status: myStatus,
        download_status: downloadStatus,
        my_rating: myRating ? Number(myRating) : null,
        is_favorite: isFavorite,
        is_anime: isAnime,
      },
    })
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="movie">Фильм</SelectItem>
                <SelectItem value="series">Сериал</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Мой статус</Label>
            <Select value={myStatus} onValueChange={setMyStatus}>
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
            <Input type="number" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Год окончания</Label>
            <Input type="number" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Статус загрузки</Label>
            <Select value={downloadStatus} onValueChange={setDownloadStatus}>
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
            <Input type="number" min={1} max={10} value={myRating} onChange={(e) => setMyRating(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_favorite" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
          <Label htmlFor="is_favorite">Избранное</Label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_anime" checked={isAnime} onChange={(e) => setIsAnime(e.target.checked)} />
          <Label htmlFor="is_anime">Аниме</Label>
        </div>
        <Button type="submit" className="w-full">Сохранить</Button>
      </form>
    </div>
  )
}