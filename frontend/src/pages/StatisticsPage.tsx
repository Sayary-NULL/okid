import { useStatistics } from '@/hooks/useApi'
import type { StatDimension } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HistogramChart } from '@/components/StatsCharts'

const DIMENSIONS: { key: StatDimension; title: string }[] = [
  { key: 'rating', title: 'По оценкам' },
  { key: 'my_status', title: 'По статусу просмотра' },
  { key: 'informer', title: 'По рекомендациям' },
  { key: 'favorite', title: 'По избранному' },
  { key: 'download_status', title: 'По статусу загрузки' },
  { key: 'genre', title: 'По жанрам' },
  { key: 'year', title: 'По году выхода' },
]

function SummaryCard({
  title,
  total,
  anime,
  notAnime,
}: {
  title: string
  total: number
  anime: number
  notAnime: number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-bold tabular-nums">{total}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">
            из них аниме: <span className="font-medium text-foreground">{anime}</span>
          </span>
          <span className="text-muted-foreground">
            не аниме: <span className="font-medium text-foreground">{notAnime}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StatisticsPage() {
  const { data, isLoading } = useStatistics()

  if (isLoading) {
    return <p className="text-muted-foreground">Загрузка...</p>
  }
  if (!data) {
    return <p className="text-muted-foreground">Нет данных для отображения</p>
  }

  const { summary, dimensions } = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Статистика</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Фильмы"
          total={summary.movie.total}
          anime={summary.movie.anime}
          notAnime={summary.movie.not_anime}
        />
        <SummaryCard
          title="Сериалы"
          total={summary.series.total}
          anime={summary.series.anime}
          notAnime={summary.series.not_anime}
        />
      </div>

      <Tabs defaultValue={DIMENSIONS[0].key}>
        <TabsList className="h-auto flex-wrap">
          {DIMENSIONS.map(({ key, title }) => (
            <TabsTrigger key={key} value={key}>
              {title}
            </TabsTrigger>
          ))}
        </TabsList>

        {DIMENSIONS.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardContent className="pt-6">
                <HistogramChart buckets={dimensions[key] || []} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
