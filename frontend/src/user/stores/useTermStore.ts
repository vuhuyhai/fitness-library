import { create } from 'zustand'
import { api } from '../../lib/wailsApi'
import type { TermExplanation } from '../../types'

interface TermState {
  /** In-memory cache: { [lowercaseTerm]: TermExplanation } */
  cache: Record<string, TermExplanation>
  loadingTerm: string | null
  error: string | null
}

interface TermActions {
  explainTerm: (term: string, context: string, catId: string) => Promise<TermExplanation | null>
  getCached: (term: string) => TermExplanation | null
  clearCache: () => void
}

export const useTermStore = create<TermState & TermActions>()((set, get) => ({
  cache: {},
  loadingTerm: null,
  error: null,

  getCached: (term: string) => get().cache[term.toLowerCase().trim()] ?? null,

  explainTerm: async (term: string, context: string, catId: string) => {
    const key = term.toLowerCase().trim()

    // Return from cache if available
    const cached = get().cache[key]
    if (cached) return cached

    set({ loadingTerm: term, error: null })
    try {
      const result = await api.explainTerm(term, context, catId)
      set(s => ({
        loadingTerm: null,
        cache: { ...s.cache, [key]: result },
      }))
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ loadingTerm: null, error: msg })
      return null
    }
  },

  clearCache: () => set({ cache: {} }),
}))
