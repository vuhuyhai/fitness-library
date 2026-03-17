import { create } from 'zustand'
import type { Document, Category } from '../types'

type SortBy = 'date' | 'title' | 'views' | 'read_time'
type QuickFilter = 'all' | 'trending' | 'newest' | 'saved'

interface LibraryStore {
  documents: Document[]
  categories: Category[]
  activeCategory: string | null
  activeSubCategory: string | null
  activeTags: string[]
  sortBy: SortBy
  quickFilter: QuickFilter
  isLoading: boolean

  setDocuments: (docs: Document[]) => void
  setLoading: (v: boolean) => void
  setCategories: (cats: Category[]) => void
  setActiveCategory: (id: string | null) => void
  setActiveSubCategory: (id: string | null) => void
  toggleTag: (tag: string) => void
  clearTags: () => void
  setSortBy: (sort: SortBy) => void
  setQuickFilter: (f: QuickFilter) => void
  updateDocument: (doc: Document) => void
  removeDocument: (id: string) => void
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  documents: [],
  categories: [],
  activeCategory: null,
  activeSubCategory: null,
  activeTags: [],
  sortBy: 'date',
  quickFilter: 'all',
  isLoading: false,

  setDocuments: (docs) => set({ documents: docs }),
  setLoading: (v) => set({ isLoading: v }),
  setCategories: (cats) => set({ categories: cats }),
  setActiveCategory: (id) =>
    set({ activeCategory: id, activeSubCategory: null, activeTags: [], quickFilter: 'all' }),
  setActiveSubCategory: (id) => set({ activeSubCategory: id }),
  toggleTag: (tag) =>
    set((s) => ({
      activeTags: s.activeTags.includes(tag)
        ? s.activeTags.filter((t) => t !== tag)
        : [...s.activeTags, tag],
    })),
  clearTags: () => set({ activeTags: [], activeCategory: null, activeSubCategory: null, quickFilter: 'all' }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setQuickFilter: (f) => set({ quickFilter: f, activeCategory: null, activeSubCategory: null }),
  updateDocument: (doc) =>
    set((s) => ({ documents: s.documents.map((d) => (d.id === doc.id ? doc : d)) })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
}))
