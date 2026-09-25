import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { mediaApi, genresApi, countriesApi, informersApi, searchApi, importApi, collectionsApi } from '@/api/endpoints'
import type { MediaEntry, PaginatedResponse } from '@/types'

export const useGenres = () =>
  useQuery({ queryKey: ['genres'], queryFn: genresApi.list })

export const useCountries = () =>
  useQuery({ queryKey: ['countries'], queryFn: countriesApi.list })

export const useInformersList = () =>
  useQuery({ queryKey: ['informers'], queryFn: informersApi.list })

export const useMediaList = (params?: Record<string, string>) =>
  useQuery<PaginatedResponse<MediaEntry>>({
    queryKey: ['media', params],
    queryFn: () => mediaApi.list(params),
    placeholderData: keepPreviousData,
  })

export const useMediaDetail = (id: number) =>
  useQuery({ queryKey: ['media', id], queryFn: () => mediaApi.detail(id), enabled: !!id })

export const useCreateMedia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mediaApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useUpdateMedia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      mediaApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useDeleteMedia = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mediaApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useToggleFavorite = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      mediaApi.update(id, { is_favorite: isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await qc.cancelQueries({ queryKey: ['media'] })
      const previous = qc.getQueriesData({ queryKey: ['media'] })
      qc.setQueriesData({ queryKey: ['media'] }, (old) => {
        if (!old || typeof old !== 'object') return old
        if ('results' in old && Array.isArray((old as { results?: MediaEntry[] }).results)) {
          const data = old as { results: MediaEntry[] }
          return {
            ...data,
            results: data.results.map((item) =>
              item.id === id ? { ...item, is_favorite: isFavorite } : item,
            ),
          }
        }
        if ('id' in old && (old as MediaEntry).id === id) {
          return { ...(old as MediaEntry), is_favorite: isFavorite }
        }
        return old
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, value]) => qc.setQueryData(key, value))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useSavePoster = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: mediaApi.savePoster,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useHistory = (mediaId: number) =>
  useQuery({
    queryKey: ['media', mediaId, 'history'],
    queryFn: () => mediaApi.history.list(mediaId),
    enabled: !!mediaId,
  })

export const useCreateHistory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { old_status: string; new_status: string } }) =>
      mediaApi.history.create(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useDeleteHistory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, historyId }: { id: number; historyId: number }) =>
      mediaApi.history.remove(id, historyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useInformers = (mediaId: number) =>
  useQuery({
    queryKey: ['media', mediaId, 'informers'],
    queryFn: () => mediaApi.informers.list(mediaId),
    enabled: !!mediaId,
  })

export const useCreateInformer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { informer?: number; informer_name?: string } }) =>
      mediaApi.informers.create(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['media', vars.id, 'informers'] })
      qc.invalidateQueries({ queryKey: ['informers'] })
    },
  })
}

export const useDeleteInformer = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, informerId }: { id: number; informerId: number }) =>
      mediaApi.informers.remove(id, informerId),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['media', vars.id, 'informers'] }),
  })
}

export const useSearch = () =>
  useMutation({
    mutationFn: searchApi.search,
  })

export const useImport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: importApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  })
}

export const useCollections = () =>
  useQuery({ queryKey: ['collections'], queryFn: collectionsApi.list })

export const useCollectionDetail = (id: number) =>
  useQuery({
    queryKey: ['collections', id],
    queryFn: () => collectionsApi.detail(id),
    enabled: !!id,
  })

export const useCreateCollection = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export const useUpdateCollection = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      collectionsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export const useDeleteCollection = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: collectionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export const useAddCollectionItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ collectionId, mediaEntryId }: { collectionId: number; mediaEntryId: number }) =>
      collectionsApi.addItem(collectionId, mediaEntryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export const useRemoveCollectionItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ collectionId, itemId }: { collectionId: number; itemId: number }) =>
      collectionsApi.removeItem(collectionId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections'] }),
  })
}

export const useUpdateItemPosition = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ collectionId, itemId, position }: { collectionId: number; itemId: number; position: number }) =>
      collectionsApi.updateItemPosition(collectionId, itemId, position),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['collections', vars.collectionId] }),
  })
}