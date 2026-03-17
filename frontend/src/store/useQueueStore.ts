import { create } from 'zustand'
import type { ImportQueueItem, QueueProgressPayload } from '../types'

interface QueueStore {
  items: ImportQueueItem[]
  running: boolean
  paused: boolean
  logs: string[]

  setItems: (items: ImportQueueItem[]) => void
  addItems: (items: ImportQueueItem[]) => void
  updateItem: (payload: QueueProgressPayload) => void
  setRunning: (v: boolean) => void
  setPaused: (v: boolean) => void
  clearDone: () => void
  addLog: (msg: string) => void
  clearLogs: () => void
}

function timestamp(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour12: false })
}

export const useQueueStore = create<QueueStore>((set) => ({
  items: [],
  running: false,
  paused: false,
  logs: [],

  setItems: (items) => set({ items }),
  addItems: (newItems) => set((s) => ({ items: [...newItems, ...s.items] })),

  updateItem: (payload) => set((s) => {
    const msg = `[${timestamp()}] ${payload.id.slice(0, 8)}... → ${payload.status}${payload.progress ? ` (${payload.progress}%)` : ''}${payload.error ? ' ERROR: ' + payload.error : ''}`
    return {
      items: s.items.map((it) =>
        it.id === payload.id
          ? { ...it, status: payload.status as ImportQueueItem['status'], progress: payload.progress, doc_id: payload.doc_id, error_msg: payload.error ?? '' }
          : it
      ),
      logs: [...s.logs, msg],
    }
  }),

  setRunning: (v) => set({ running: v }),
  setPaused: (v) => set({ paused: v }),
  clearDone: () => set((s) => ({ items: s.items.filter((it) => it.status !== 'done' && it.status !== 'error') })),
  addLog: (msg) => set((s) => ({ logs: [...s.logs, `[${timestamp()}] ${msg}`] })),
  clearLogs: () => set({ logs: [] }),
}))
