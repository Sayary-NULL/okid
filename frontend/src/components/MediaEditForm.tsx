import {
  useMediaDetail, useUpdateMedia, useSavePoster,
  useSetMediaPoster, useRemoveMediaPoster,
} from '@/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useState, useEffect, useRef } from 'react'

export function MediaEditForm({ mediaId, onDone }: { mediaId: number; onDone: () => void }) {
  const { data: entry, isLoading } = useMediaDetail(mediaId)
  const updateMedia = useUpdateMedia()
  const savePoster = useSavePoster()
  const setPoster = useSetMediaPoster()
  const removePoster = useRemoveMediaPoster()
  const posterInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const [title, setTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [mediaType, setMediaType] = useState('movie')
  const [description, setDescription] = useState('')
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [isAnime, setIsAnime] = useState(false)
  const [posterUrl, setPosterUrl] = useState('')

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setOriginalTitle(entry.original_title || '')
      setMediaType(entry.media_type)
      setDescription(entry.description || '')
      setYearStart(entry.year_start?.toString() || '')
      setYearEnd(entry.year_end?.toString() || '')
      setIsAnime(entry.is_anime)
      setPosterUrl(entry.poster_url || '')
    }
  }, [entry])

  useEffect(() => {
    const el = descriptionRef.current
    if (!el) return
    el.style.height = 'auto'
    const border = el.offsetHeight - el.clientHeight
    el.style.height = `${el.scrollHeight + border}px`
  }, [description])

  const handleSavePoster = async () => {
    await savePoster.mutateAsync(mediaId)
  }

  const handlePosterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await setPoster.mutateAsync({ id: mediaId, file })
    }
    e.target.value = ''
  }

  const handleRemovePoster = async () => {
    await removePoster.mutateAsync(mediaId)
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
        poster_url: posterUrl,
      },
    })
    onDone()
  }

  if (isLoading) return <p className="text-muted-foreground">Загрузка...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Редактировать дело</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="poster_url">Ссылка на постер</Label>
          <Input
            id="poster_url"
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="flex items-start gap-4">
            <div className="w-32 flex-shrink-0">
              {entry?.poster_local || posterUrl ? (
                <img
                  src={entry?.poster_local || posterUrl}
                  alt=""
                  className="w-full rounded-lg shadow"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                  Нет постера
                </div>
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => posterInputRef.current?.click()}
                disabled={setPoster.isPending}
              >
                {entry?.poster_local ? 'Заменить своим постером' : 'Загрузить свой постер'}
              </Button>
              {entry?.poster_local && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemovePoster}
                  disabled={removePoster.isPending}
                >
                  Удалить локальный постер
                </Button>
              )}
              {entry?.poster_url && !entry.poster_local && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSavePoster}
                  disabled={savePoster.isPending}
                >
                  Сохранить постер локально
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Загруженный постер имеет приоритет над ссылкой
              </p>
            </div>
            <input
              ref={posterInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePosterChange}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Название</Label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Оригинальное название</Label>
          <Input value={originalTitle} onChange={(e) => setOriginalTitle(e.target.value)} />
        </div>
        <div className="grid w-fit grid-cols-[auto_auto_auto_auto] items-center gap-x-3 gap-y-2">
          <Label>Тип</Label>
          <span />
          <Label>Год начала</Label>
          <Label>Год окончания</Label>
          <Select value={mediaType} onValueChange={(v) => { if (v) setMediaType(v) }}>
            <SelectTrigger className="w-28">
              <SelectValue>{mediaType === 'series' ? 'Сериал' : 'Фильм'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="movie">Фильм</SelectItem>
              <SelectItem value="series">Сериал</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={isAnime ? 'default' : 'outline'}
            className="justify-self-start"
            onClick={() => setIsAnime((v) => !v)}
          >
            Аниме
          </Button>
          <Input type="number" className="w-16 justify-self-start [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" maxLength={4} value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
          <Input type="number" className="w-16 justify-self-start [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" maxLength={4} value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea ref={descriptionRef} className="max-h-[50vh] resize-none overflow-y-auto" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onDone}>
            Отмена
          </Button>
          <Button type="submit" className="flex-1">Сохранить</Button>
        </div>
      </form>
    </div>
  )
}
