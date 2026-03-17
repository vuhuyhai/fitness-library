import { create } from 'zustand'

interface UIStore {
  viewerOpen: boolean
  selectedDocId: string | null
  viewMode: 'grid' | 'list'
  searchQuery: string
  mobileSidebarOpen: boolean

  openViewer: (docId: string) => void
  closeViewer: () => void
  setViewMode: (mode: 'grid' | 'list') => void
  setSearchQuery: (q: string) => void
  setMobileSidebarOpen: (v: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  viewerOpen: false,
  selectedDocId: null,
  viewMode: 'grid',
  searchQuery: '',
  mobileSidebarOpen: false,

  openViewer: (docId) => set({ viewerOpen: true, selectedDocId: docId }),
  closeViewer: () => set({ viewerOpen: false, selectedDocId: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),
}))
