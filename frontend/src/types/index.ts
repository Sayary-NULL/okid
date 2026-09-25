export interface Genre {
  id: number
  name: string
  slug: string
}

export interface Country {
  id: number
  name: string
}

export interface Informer {
  id: number
  name: string
}

export type MediaType = 'movie' | 'series'
export type MyStatus = 'plan_to_watch' | 'watching' | 'dropped' | 'completed'
export type DownloadStatus = 'none' | 'need_download' | 'downloaded'

export interface MediaEntry {
  id: number
  title: string
  original_title: string
  description: string
  short_description: string
  media_type: MediaType
  year_start: number | null
  year_end: number | null
  poster_url: string
  poster_local: string | null
  is_favorite: boolean
  is_anime: boolean
  my_status: MyStatus
  download_status: DownloadStatus
  my_rating: number | null
  movie_length: number | null
  is_series: boolean
  total_series_length: number | null
  series_length: number | null
  status: string
  external_kp_id: string
  external_imdb_id: string
  external_tmdb_id: string
  external_shikimori_id: string
  rating_kp: number | null
  rating_imdb: number | null
  rating_tmdb: number | null
  rating_shikimori: number | null
  genres: Genre[]
  countries: Country[]
  collections?: { id: number; name: string; poster?: string | null }[]
  created_at: string
  updated_at: string
}

export interface MediaHistory {
  id: number
  old_status: string
  new_status: string
  created_at: string
}

export interface MediaInformer {
  id: number
  informer: Informer
  created_at: string
}

export interface Collection {
  id: number
  name: string
  description: string
  poster: string | null
  item_count: number
  created_at: string
}

export interface CollectionDetail {
  id: number
  name: string
  description: string
  poster: string | null
  items: CollectionItem[]
  created_at: string
}

export interface CollectionItem {
  id: number
  media_entry: number
  media_entry_detail: MediaEntry
  position: number
  created_at: string
}

export interface SearchResult {
  external_id: number | string
  title: string
  original_title: string
  year: number | null
  description: string
  short_description: string
  poster_url: string
  media_type: string
  is_anime?: boolean
  rating_kp: number | null
  rating_imdb: number | null
  rating_tmdb: number | null
  rating_shikimori: number | null
  status: string
  movie_length: number | null
  is_series: boolean
  total_series_length: number | null
  series_length: number | null
  external_kp_id: string
  external_imdb_id: string
  external_tmdb_id: string
  external_shikimori_id: string
  genres: string[]
  countries: string[]
  year_start: number | null
  year_end: number | null
}

export interface PaginatedResponse<T> {
  count: number
  page: number
  page_size: number
  total_pages: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AuthTokens {
  access: string
  refresh: string
}