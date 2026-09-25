import api from './client'
import type { AuthTokens, MediaEntry, PaginatedResponse } from '@/types'

export const authApi = {
  register: (data: { username: string; password: string }) =>
    api.post('/auth/register/', data),

  login: (data: { username: string; password: string }) =>
    api.post<AuthTokens>('/auth/login/', data),

  refresh: (refresh: string) =>
    api.post<AuthTokens>('/auth/token/refresh/', { refresh }),
}

export const genresApi = {
  list: () => api.get('/genres/').then((r) => r.data),
}

export const countriesApi = {
  list: () => api.get('/countries/').then((r) => r.data),
}

export const informersApi = {
  list: () => api.get('/informers/').then((r) => r.data),
  create: (data: { name: string }) =>
    api.post('/informers/', data).then((r) => r.data),
}

export const mediaApi = {
  list: (params?: Record<string, string>) =>
    api
      .get<PaginatedResponse<MediaEntry>>('/media/', { params })
      .then((r) => r.data),

  detail: (id: number) =>
    api.get(`/media/${id}/`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    api.post('/media/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/media/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/media/${id}/`),

  savePoster: (id: number) =>
    api.post(`/media/${id}/save-poster/`).then((r) => r.data),

  history: {
    list: (id: number) =>
      api.get(`/media/${id}/history/`).then((r) => r.data),
    create: (id: number, data: { old_status: string; new_status: string }) =>
      api.post(`/media/${id}/history/`, data).then((r) => r.data),
    remove: (id: number, historyId: number) =>
      api.delete(`/media/${id}/history/${historyId}/`),
  },

  informers: {
    list: (id: number) =>
      api.get(`/media/${id}/informers/`).then((r) => r.data),
    create: (id: number, data: { informer?: number; informer_name?: string }) =>
      api.post(`/media/${id}/informers/`, data).then((r) => r.data),
    remove: (id: number, informerId: number) =>
      api.delete(`/media/${id}/informers/${informerId}/`),
  },
}

export const searchApi = {
  search: (data: { query: string; type: string; year?: number; source: 'poiskkino' | 'shikimori' }) =>
    api.post('/search/', data).then((r) => r.data),
}

export const importApi = {
  import: (data: Record<string, unknown>) =>
    api.post('/import/', data).then((r) => r.data),
}

export const collectionsApi = {
  list: () =>
    api.get('/collections/').then((r) => r.data),

  detail: (id: number) =>
    api.get(`/collections/${id}/`).then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    api.post('/collections/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    api.patch(`/collections/${id}/`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/collections/${id}/`),

  addItem: (collectionId: number, mediaEntryId: number) =>
    api.post(`/collections/${collectionId}/items/`, {
      media_entry: mediaEntryId,
    }).then((r) => r.data),

  removeItem: (collectionId: number, itemId: number) =>
    api.delete(`/collections/${collectionId}/items/${itemId}/`),

  updateItemPosition: (
    collectionId: number,
    itemId: number,
    position: number,
  ) =>
    api.patch(`/collections/${collectionId}/items/${itemId}/`, {
      position,
    }).then((r) => r.data),
}