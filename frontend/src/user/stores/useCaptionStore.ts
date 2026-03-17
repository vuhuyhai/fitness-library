/**
 * Zustand store for AI-generated Facebook captions.
 * Caches results for 30 minutes to avoid redundant API calls.
 */
import { create } from 'zustand'
import type { CaptionResult } from '../../types'

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry {
  result: CaptionResult
  fetchedAt: number
}

interface CaptionStore {
  cache: Record<string, CacheEntry>
  loading: Record<string, boolean>
  errors: Record<string, string>

  getCaption: (docId: string) => CaptionResult | null
  isLoading: (docId: string) => boolean
  getError: (docId: string) => string | null
  setLoading: (docId: string, loading: boolean) => void
  setCaption: (docId: string, result: CaptionResult) => void
  setError: (docId: string, error: string) => void
  clearCache: (docId?: string) => void
}

export const useCaptionStore = create<CaptionStore>((set, get) => ({
  cache: {},
  loading: {},
  errors: {},

  getCaption: (docId) => {
    const entry = get().cache[docId]
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null
    return entry.result
  },

  isLoading: (docId) => get().loading[docId] ?? false,

  getError: (docId) => get().errors[docId] ?? null,

  setLoading: (docId, loading) =>
    set((s) => ({ loading: { ...s.loading, [docId]: loading } })),

  setCaption: (docId, result) =>
    set((s) => ({
      cache: { ...s.cache, [docId]: { result, fetchedAt: Date.now() } },
      loading: { ...s.loading, [docId]: false },
      errors: { ...s.errors, [docId]: '' },
    })),

  setError: (docId, error) =>
    set((s) => ({
      errors: { ...s.errors, [docId]: error },
      loading: { ...s.loading, [docId]: false },
    })),

  clearCache: (docId) => {
    if (docId) {
      set((s) => {
        const cache = { ...s.cache }
        delete cache[docId]
        return { cache }
      })
    } else {
      set({ cache: {} })
    }
  },
}))

/**
 * Fetch captions for a doc, using the cache if available.
 * Call this from components — it handles loading/error state automatically.
 */
export async function fetchCaptions(
  docId: string,
  generateFn: (id: string) => Promise<CaptionResult>,
): Promise<void> {
  const store = useCaptionStore.getState()
  if (store.getCaption(docId) || store.isLoading(docId)) return

  store.setLoading(docId, true)
  try {
    const result = await generateFn(docId)
    useCaptionStore.getState().setCaption(docId, result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi tạo caption'
    useCaptionStore.getState().setError(docId, msg)
  }
}
