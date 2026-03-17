import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReadingProgress, ReadingProgressDTO } from '../../types'
import { api } from '../../lib/wailsApi'

// Debounce SQLite sync: at most once per 60s per doc
const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function syncToSQLite(p: ReadingProgress) {
  clearTimeout(syncTimers[p.docId])
  syncTimers[p.docId] = setTimeout(() => {
    const dto: ReadingProgressDTO = {
      doc_id: p.docId,
      scroll_percent: p.scrollPercent,
      page_number: p.pageNumber,
      total_pages: p.totalPages,
      last_read_at: p.lastReadAt,
      reading_time_seconds: p.readingTimeSeconds,
    }
    api.saveReadingProgress(dto).catch(() => {})
  }, 60_000)
}

interface UserProgressState {
  readingProgress: Record<string, ReadingProgress>
  recentlyRead: string[]
  unlockedDocs: string[]

  updateScrollProgress: (docId: string, percent: number) => void
  updatePageProgress: (docId: string, page: number, total: number) => void
  addReadingTime: (docId: string, seconds: number) => void
  markAsRead: (docId: string) => void
  clearProgress: (docId: string) => void
  getProgress: (docId: string) => ReadingProgress | null
  // Compat shim used by existing code
  updateProgress: (docId: string, pct: number) => void

  setUnlockedDocs: (ids: string[]) => void
  addUnlocked: (docId: string) => void
  isUnlocked: (docId: string) => boolean
}

export const useUserProgressStore = create<UserProgressState>()(
  persist(
    (set, get) => ({
      readingProgress: {},
      recentlyRead: [],
      unlockedDocs: [],

      updateScrollProgress: (docId, percent) => {
        const now = new Date().toISOString()
        set((s) => {
          const existing = s.readingProgress[docId]
          const updated: ReadingProgress = {
            docId,
            scrollPercent: Math.round(percent),
            pageNumber: existing?.pageNumber ?? 1,
            totalPages: existing?.totalPages ?? 0,
            lastReadAt: now,
            readingTimeSeconds: existing?.readingTimeSeconds ?? 0,
          }
          syncToSQLite(updated)
          return {
            readingProgress: { ...s.readingProgress, [docId]: updated },
            recentlyRead: [docId, ...s.recentlyRead.filter((id) => id !== docId)].slice(0, 50),
          }
        })
      },

      updatePageProgress: (docId, page, total) => {
        const now = new Date().toISOString()
        const pct = total > 0 ? Math.round((page / total) * 100) : 0
        set((s) => {
          const existing = s.readingProgress[docId]
          const updated: ReadingProgress = {
            docId,
            scrollPercent: pct,
            pageNumber: page,
            totalPages: total,
            lastReadAt: now,
            readingTimeSeconds: existing?.readingTimeSeconds ?? 0,
          }
          syncToSQLite(updated)
          return {
            readingProgress: { ...s.readingProgress, [docId]: updated },
            recentlyRead: [docId, ...s.recentlyRead.filter((id) => id !== docId)].slice(0, 50),
          }
        })
      },

      addReadingTime: (docId, seconds) => {
        set((s) => {
          const existing = s.readingProgress[docId]
          if (!existing) return s
          const updated: ReadingProgress = {
            ...existing,
            readingTimeSeconds: (existing.readingTimeSeconds ?? 0) + seconds,
            lastReadAt: new Date().toISOString(),
          }
          syncToSQLite(updated)
          return { readingProgress: { ...s.readingProgress, [docId]: updated } }
        })
      },

      markAsRead: (docId) => {
        const now = new Date().toISOString()
        set((s) => {
          const existing = s.readingProgress[docId]
          const updated: ReadingProgress = {
            docId,
            scrollPercent: 100,
            pageNumber: existing?.totalPages ?? 1,
            totalPages: existing?.totalPages ?? 0,
            lastReadAt: now,
            readingTimeSeconds: existing?.readingTimeSeconds ?? 0,
          }
          syncToSQLite(updated)
          return {
            readingProgress: { ...s.readingProgress, [docId]: updated },
            recentlyRead: [docId, ...s.recentlyRead.filter((id) => id !== docId)].slice(0, 50),
          }
        })
      },

      clearProgress: (docId) => {
        set((s) => {
          const { [docId]: _removed, ...rest } = s.readingProgress
          return { readingProgress: rest }
        })
      },

      getProgress: (docId) => get().readingProgress[docId] ?? null,

      // Compat shim
      updateProgress: (docId, pct) => get().updateScrollProgress(docId, pct),

      setUnlockedDocs: (ids) => set({ unlockedDocs: ids }),
      addUnlocked: (docId) =>
        set((s) => ({
          unlockedDocs: s.unlockedDocs.includes(docId) ? s.unlockedDocs : [...s.unlockedDocs, docId],
        })),
      isUnlocked: (docId) => get().unlockedDocs.includes(docId),
    }),
    {
      name: 'fitness-library-user-data',
      partialize: (s) => ({
        readingProgress: s.readingProgress,
        recentlyRead: s.recentlyRead,
        unlockedDocs: s.unlockedDocs,
      }),
    }
  )
)
