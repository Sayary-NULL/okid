import { useEffect, useState } from 'react'
import { useReimport, useReimportPreview } from '@/hooks/useApi'
import type { ReimportPreview } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Source = 'poiskkino' | 'shikimori'

const sourceLabels: Record<Source, string> = {
  poiskkino: 'ПоискКино',
  shikimori: 'Шикимори',
}

export function ReimportDialog({
  mediaId,
  open,
  onOpenChange,
  hasPk,
  hasShikimori,
  hasLocalPoster,
}: {
  mediaId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  hasPk: boolean
  hasShikimori: boolean
  hasLocalPoster: boolean
}) {
  const [source, setSource] = useState<Source>(hasPk ? 'poiskkino' : 'shikimori')
  const [fields, setFields] = useState<string[]>([
    'title', 'description', 'poster_url', 'links', 'ratings',
  ])
  const reimport = useReimport()

  const { data, isLoading, error } = useReimportPreview(mediaId, source, open)

  useEffect(() => {
    if (open) setSource(hasPk ? 'poiskkino' : 'shikimori')
  }, [open, hasPk])

  const toggleField = (field: string) =>
    setFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    )

  const handleConfirm = async () => {
    await reimport.mutateAsync({ id: mediaId, data: { source, fields } })
    onOpenChange(false)
  }

  const preview = data as ReimportPreview | undefined
  const errorMessage = error
    ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ||
      'Не удалось получить данные из внешнего архива.')
    : ''

  const fieldRow = (key: string, label: string, disabled = false) => (
    <label
      className={`flex items-center gap-3 rounded border p-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <input
        type="checkbox"
        checked={fields.includes(key)}
        disabled={disabled}
        onChange={() => toggleField(key)}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Реимпорт данных</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Откуда импортировать</Label>
            <Select value={source} onValueChange={(v) => { if (v) setSource(v as Source) }}>
              <SelectTrigger>
                <SelectValue>{sourceLabels[source]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poiskkino" disabled={!hasPk}>
                  ПоискКино
                </SelectItem>
                <SelectItem value="shikimori" disabled={!hasShikimori}>
                  Шикимори
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {isLoading && <p className="text-sm text-muted-foreground">Загрузка данных...</p>}

          {preview && !isLoading && (
            <div className="space-y-2">
              {fieldRow('title', 'Название')}
              {fieldRow('description', 'Описание')}
              {fieldRow('poster_url', 'Ссылка на постер', hasLocalPoster)}
              {fieldRow('links', 'Ссылки')}
              {fieldRow('ratings', 'Оценки')}
              {hasLocalPoster && (
                <p className="text-xs text-muted-foreground">
                  Загружен локальный постер — ссылка не будет перезаписана
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!preview || reimport.isPending}
              onClick={handleConfirm}
            >
              Импортировать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
