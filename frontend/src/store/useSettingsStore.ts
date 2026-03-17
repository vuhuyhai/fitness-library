import { create } from 'zustand'

interface SettingsStore {
  settings: Record<string, string>
  aiStatus: 'unknown' | 'connected' | 'offline'
  setSettings: (s: Record<string, string>) => void
  updateSetting: (key: string, value: string) => void
  setAiStatus: (s: 'unknown' | 'connected' | 'offline') => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  aiStatus: 'unknown',
  setSettings: (s) => set({ settings: s }),
  updateSetting: (key, value) =>
    set((st) => ({ settings: { ...st.settings, [key]: value } })),
  setAiStatus: (s) => set({ aiStatus: s }),
}))
