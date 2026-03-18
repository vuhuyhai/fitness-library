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
  addDocument: (doc: Document) => void

  // Selection mode (admin batch delete)
  isSelectionMode: boolean
  selectedDocIds: Set<string>
  toggleSelectionMode: () => void
  toggleSelectDoc: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
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
  addDocument: (doc) =>
    set((s) => ({
      documents: s.documents.some((d) => d.id === doc.id)
        ? s.documents
        : [doc, ...s.documents],
    })),

  // Selection
  isSelectionMode: false,
  selectedDocIds: new Set(),
  toggleSelectionMode: () =>
    set((s) => ({ isSelectionMode: !s.isSelectionMode, selectedDocIds: new Set() })),
  toggleSelectDoc: (id) =>
    set((s) => {
      const next = new Set(s.selectedDocIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { selectedDocIds: next }
    }),
  selectAll: (ids) => set({ selectedDocIds: new Set(ids) }),
  clearSelection: () => set({ selectedDocIds: new Set(), isSelectionMode: false }),
}))
